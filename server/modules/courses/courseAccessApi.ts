import type { Express, Request, Response } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { z } from "zod";
import { authorizeRequest } from "../auth/authorization";
import { resolveRequestUserId } from "../auth/currentUser";
import { courses as seedCourses } from "../../../shared/data/mockCourses";
import {
  ApiResponseSchema,
  CourseCheckoutCreateRequestSchema,
  CourseCheckoutOrderResultSchema,
  CourseCheckoutPayRequestSchema,
  CourseAccessStateSchema,
  CourseSchema,
  LOCAL_COURSE_ACCESS_USER_ID,
  LegacyNumericIdSchema,
  PaymentBusinessOrderSnapshotSchema,
  RefundSucceededWebhookEventSchema,
  RefundWebhookProcessingResultSchema,
  activateCourseMembership,
  applyRefundSucceededWebhookToOrder,
  cancelCourseCheckoutOrder,
  courseMatchesMarketingRule,
  createCourseCheckoutOrder,
  createCourseCheckoutOrderResult,
  findCourseAccessOrder,
  isCourseMarketingRuleActiveAt,
  payCourseCheckoutOrder,
  upsertCourseAccessOrder,
  useUserCouponClaim,
  type Course,
  type CourseAccessState,
  type CourseCheckoutCouponApplicationInput,
  type CourseCheckoutOrderResult,
  type OrderAdminAuditEvent,
  type OrderAdminExceptionFlag,
  type PaymentBusinessOrderSnapshot,
  type RefundSucceededWebhookEvent,
  type UserPreference,
  type UserAdminMembershipAuditEvent,
} from "../../../shared/domain";
import {
  courseFromCourseProduct,
  getCourseProductStore,
  type CourseProductStore,
} from "../catalog/courseProductStore";
import {
  getCourseMarketingRuleStore,
  type CourseMarketingRuleStore,
} from "../marketing/courseMarketingRuleStore";
import {
  loadUserPreferenceForUser,
  saveUserPreferenceForUser,
} from "../users/userPreferenceApi";
import {
  createDefaultCourseAccessStore,
  type CourseAccessStore,
} from "./courseAccessStore";

const CourseAccessResponseSchema = ApiResponseSchema(CourseAccessStateSchema);
const CourseCheckoutOrderResponseSchema = ApiResponseSchema(
  CourseCheckoutOrderResultSchema
);
const CourseRefundWebhookResponseSchema = ApiResponseSchema(
  RefundWebhookProcessingResultSchema
);
const PurchaseCourseRequestSchema = z.object({
  courseId: LegacyNumericIdSchema,
});

let courseAccessStore = createDefaultCourseAccessStore();

function validatedCourses() {
  return seedCourses.map(course => CourseSchema.parse(course));
}

function sendJson(
  res: Response | ServerResponse,
  status: number,
  payload: unknown
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function statePayload(state: CourseAccessState) {
  return CourseAccessResponseSchema.parse({
    ok: true,
    data: state,
  });
}

function checkoutOrderPayload(checkout: CourseCheckoutOrderResult) {
  return CourseCheckoutOrderResponseSchema.parse({
    ok: true,
    data: checkout,
  });
}

function errorPayload(
  code:
    | "BAD_REQUEST"
    | "NOT_FOUND"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "CONFLICT"
    | "INTERNAL_ERROR",
  message: string
) {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  } as const;
}

function findCourse(courseId: number) {
  return validatedCourses().find(course => course.id === courseId);
}

async function findCheckoutCourse(
  courseId: number,
  store: CourseProductStore = getCourseProductStore()
) {
  const product = (await store.listProducts()).find(
    item => item.courseId === courseId
  );
  if (!product) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "课程不存在"),
    } as const;
  }

  if (product.status !== "published" || product.reviewStatus !== "approved") {
    return {
      status: 409,
      body: errorPayload("CONFLICT", "课程暂未上架，无法购买"),
    } as const;
  }

  return {
    status: 200,
    course: CourseSchema.parse(courseFromCourseProduct(product)),
  } as const;
}

async function resolveCourseCheckoutCouponApplication({
  couponClaimId,
  course,
  marketingRuleStore,
  now,
  userId,
}: {
  couponClaimId?: string;
  course: Course;
  marketingRuleStore: Pick<CourseMarketingRuleStore, "getRule">;
  now: string;
  userId: string;
}): Promise<{
  application?: CourseCheckoutCouponApplicationInput;
  preference?: UserPreference;
}> {
  if (!couponClaimId) return {};

  const preference = await loadUserPreferenceForUser(userId, now);
  const claim = preference.couponClaims.find(item => item.id === couponClaimId);
  if (!claim) throw new Error("USER_COUPON_CLAIM_NOT_FOUND");
  if (claim.status !== "claimed") throw new Error("USER_COUPON_NOT_CLAIMED");
  if (claim.expiresAt && Date.parse(claim.expiresAt) <= Date.parse(now)) {
    throw new Error("USER_COUPON_EXPIRED");
  }

  const rule = await marketingRuleStore.getRule(claim.marketingRuleId, now);
  if (!rule || rule.type !== "course_coupon") {
    throw new Error("COURSE_COUPON_RULE_NOT_FOUND");
  }

  if (
    !isCourseMarketingRuleActiveAt(rule, now) ||
    !courseMatchesMarketingRule(course, rule)
  ) {
    throw new Error("COURSE_COUPON_NOT_APPLICABLE");
  }

  return {
    application: {
      couponClaimId: claim.id,
      couponMarketingRuleId: rule.id,
    },
    preference,
  };
}

function checkoutActionFailure(err: unknown, fallbackMessage: string) {
  const message = err instanceof Error ? err.message : fallbackMessage;
  const isCouponConflict =
    message.startsWith("USER_COUPON") ||
    message === "COURSE_COUPON_NOT_APPLICABLE";
  if (
    [
      "COURSE_IS_FREE",
      "COURSE_NOT_PURCHASABLE",
      "MEMBERSHIP_NOT_PURCHASABLE",
      "CHECKOUT_ORDER_NOT_PAYABLE",
      "SIMULATED_PAYMENT_FAILED",
      "INVALID_ORDER_CLOSE_TRANSITION",
      "USER_COUPON_NOT_CLAIMED",
      "USER_COUPON_ALREADY_USED",
      "USER_COUPON_EXPIRED",
      "COURSE_COUPON_NOT_APPLICABLE",
    ].includes(message)
  ) {
    return {
      status: 409,
      body: errorPayload(
        "CONFLICT",
        message === "SIMULATED_PAYMENT_FAILED"
          ? "模拟支付失败，订单仍可继续支付"
          : isCouponConflict
            ? "当前优惠券状态不支持这笔订单"
            : "当前订单状态不支持此操作"
      ),
    } as const;
  }

  if (
    message === "CHECKOUT_ORDER_NOT_FOUND" ||
    message === "USER_COUPON_CLAIM_NOT_FOUND" ||
    message === "COURSE_COUPON_RULE_NOT_FOUND"
  ) {
    return {
      status: 404,
      body: errorPayload(
        "NOT_FOUND",
        message === "CHECKOUT_ORDER_NOT_FOUND"
          ? "课程订单不存在"
          : "优惠券不存在或未领取"
      ),
    } as const;
  }

  return {
    status: 500,
    body: errorPayload("INTERNAL_ERROR", fallbackMessage),
  } as const;
}

function readRequestBody(req: IncomingMessage): Promise<unknown> {
  return new Promise(resolve => {
    let body = "";
    req.on("data", chunk => {
      body += chunk.toString();
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(undefined);
      }
    });
  });
}

export function setCourseAccessStore(store: CourseAccessStore) {
  courseAccessStore = store;
}

export function resetCourseAccessStore(
  state?: CourseAccessState,
  userId = LOCAL_COURSE_ACCESS_USER_ID
) {
  if (state) {
    return Promise.resolve(
      courseAccessStore.reset(userId, CourseAccessStateSchema.parse(state))
    );
  }

  return Promise.resolve(courseAccessStore.clear());
}

export async function getCourseAccessPayload(
  userId = LOCAL_COURSE_ACCESS_USER_ID
) {
  return statePayload(await loadCourseAccessState(userId));
}

export function loadCourseAccessState(userId = LOCAL_COURSE_ACCESS_USER_ID) {
  return Promise.resolve(courseAccessStore.load(userId));
}

export function listCourseAccessUserStates() {
  return Promise.resolve(courseAccessStore.listUserStates());
}

export function saveCourseAccessState(
  userId: string,
  state: CourseAccessState
) {
  return Promise.resolve(courseAccessStore.save(userId, state));
}

export async function findCourseAccessOrderSource(orderId: string) {
  const userStates = await listCourseAccessUserStates();
  for (const item of userStates) {
    const order = findCourseAccessOrder(item.state, orderId);
    if (order) {
      return {
        userId: item.userId,
        state: item.state,
        order,
      };
    }
  }

  return undefined;
}

export async function getCourseAccessPaymentOrderSnapshot(
  orderId: string
): Promise<PaymentBusinessOrderSnapshot | undefined> {
  const source = await findCourseAccessOrderSource(orderId);
  if (!source) return undefined;

  return PaymentBusinessOrderSnapshotSchema.parse({
    domain: "course_access",
    orderId,
    userId: source.userId,
    orderStatus: source.order.status,
    payableAmount: source.order.payableAmount,
    paidAt: source.order.paidAt,
  });
}

export async function processCourseAccessRefundWebhookEvent(
  event: RefundSucceededWebhookEvent
) {
  const refundEvent = RefundSucceededWebhookEventSchema.parse(event);
  const source = await findCourseAccessOrderSource(refundEvent.orderId);
  if (!source) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "退款回调关联的课程订单不存在"),
    } as const;
  }

  let webhookResult: ReturnType<typeof applyRefundSucceededWebhookToOrder>;
  try {
    webhookResult = applyRefundSucceededWebhookToOrder(
      source.order,
      refundEvent
    );
  } catch (err) {
    const message =
      err instanceof Error && err.message === "REFUND_WEBHOOK_AMOUNT_MISMATCH"
        ? "退款回调金额与课程订单金额不一致"
        : "课程订单当前状态不支持退款成功回调";
    return {
      status: 409,
      body: errorPayload("CONFLICT", message),
    } as const;
  }

  try {
    await saveCourseAccessState(
      source.userId,
      upsertCourseAccessOrder(source.state, webhookResult.order)
    );

    return {
      status: 200,
      body: CourseRefundWebhookResponseSchema.parse({
        ok: true,
        data: webhookResult,
      }),
    } as const;
  } catch (err) {
    console.error(err instanceof Error ? err.message : "课程退款回调处理失败");
    return {
      status: 500,
      body: errorPayload("INTERNAL_ERROR", "课程退款回调处理失败，请稍后重试"),
    } as const;
  }
}

export function listMembershipAuditEvents(userId: string) {
  return Promise.resolve(courseAccessStore.listMembershipAuditEvents(userId));
}

export function listAllMembershipAuditEvents() {
  return Promise.resolve(courseAccessStore.listAllMembershipAuditEvents());
}

export function appendMembershipAuditEvent(
  event: UserAdminMembershipAuditEvent
) {
  return Promise.resolve(courseAccessStore.appendMembershipAuditEvent(event));
}

export function listOrderAdminAuditEvents(orderId: string) {
  return Promise.resolve(courseAccessStore.listOrderAdminAuditEvents(orderId));
}

export function listAllOrderAdminAuditEvents() {
  return Promise.resolve(courseAccessStore.listAllOrderAdminAuditEvents());
}

export function appendOrderAdminAuditEvent(event: OrderAdminAuditEvent) {
  return Promise.resolve(courseAccessStore.appendOrderAdminAuditEvent(event));
}

export function listOrderAdminExceptionFlags() {
  return Promise.resolve(courseAccessStore.listOrderAdminExceptionFlags());
}

export function saveOrderAdminExceptionFlag(flag: OrderAdminExceptionFlag) {
  return Promise.resolve(courseAccessStore.saveOrderAdminExceptionFlag(flag));
}

export async function purchaseCoursePayload(
  courseId: number,
  userId = LOCAL_COURSE_ACCESS_USER_ID
) {
  const course = findCourse(courseId);
  if (!course) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "课程不存在"),
    } as const;
  }

  try {
    const currentState = await courseAccessStore.load(userId);
    const pendingCheckout = createCourseCheckoutOrder(
      currentState,
      course,
      "course",
      undefined,
      userId
    );
    const paidCheckout = payCourseCheckoutOrder(
      pendingCheckout.accessState,
      pendingCheckout.order.id,
      "manual"
    );
    await courseAccessStore.save(userId, paidCheckout.accessState);

    return {
      status: 200,
      body: statePayload(paidCheckout.accessState),
    } as const;
  } catch (err) {
    return checkoutActionFailure(err, "课程购买失败");
  }
}

export async function createCourseCheckoutOrderPayload(
  body: unknown,
  userId = LOCAL_COURSE_ACCESS_USER_ID,
  now = new Date().toISOString(),
  productStore: CourseProductStore = getCourseProductStore(),
  marketingRuleStore: Pick<
    CourseMarketingRuleStore,
    "getRule"
  > = getCourseMarketingRuleStore()
) {
  const parsed = CourseCheckoutCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程订单创建参数不合法"),
    } as const;
  }

  const coursePayload = await findCheckoutCourse(
    parsed.data.courseId,
    productStore
  );
  if (coursePayload.status !== 200) return coursePayload;

  try {
    const { application } = await resolveCourseCheckoutCouponApplication({
      couponClaimId:
        parsed.data.mode === "course" ? parsed.data.couponClaimId : undefined,
      course: coursePayload.course,
      marketingRuleStore,
      now,
      userId,
    });
    const currentState = await courseAccessStore.load(userId);
    const checkout = createCourseCheckoutOrder(
      currentState,
      coursePayload.course,
      parsed.data.mode,
      now,
      userId,
      application
    );
    await courseAccessStore.save(userId, checkout.accessState);

    return {
      status: 200,
      body: checkoutOrderPayload(checkout),
    } as const;
  } catch (err) {
    return checkoutActionFailure(err, "课程订单创建失败");
  }
}

export async function getCourseCheckoutOrderPayload(
  orderId: string,
  userId = LOCAL_COURSE_ACCESS_USER_ID
) {
  const currentState = await courseAccessStore.load(userId);
  const order = currentState.orders.find(item => item.id === orderId);
  if (!order) {
    return {
      status: 404,
      body: errorPayload("NOT_FOUND", "课程订单不存在"),
    } as const;
  }

  try {
    return {
      status: 200,
      body: checkoutOrderPayload(
        createCourseCheckoutOrderResult({
          state: currentState,
          order,
        })
      ),
    } as const;
  } catch (err) {
    return checkoutActionFailure(err, "课程订单读取失败");
  }
}

export async function payCourseCheckoutOrderPayload(
  orderId: string,
  body: unknown,
  userId = LOCAL_COURSE_ACCESS_USER_ID,
  now = new Date().toISOString()
) {
  const parsed = CourseCheckoutPayRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: errorPayload("BAD_REQUEST", "课程支付参数不合法"),
    } as const;
  }

  if (parsed.data.simulateResult === "failed") {
    return checkoutActionFailure(
      new Error("SIMULATED_PAYMENT_FAILED"),
      "课程支付失败"
    );
  }

  try {
    const currentState = await courseAccessStore.load(userId);
    const checkout = payCourseCheckoutOrder(
      currentState,
      orderId,
      parsed.data.paymentChannel,
      now
    );
    const couponApplication = checkout.order.couponApplication;
    const nextPreference =
      couponApplication?.claimId && checkout.order.status === "paid"
        ? useUserCouponClaim({
            preference: await loadUserPreferenceForUser(userId, now),
            couponClaimId: couponApplication.claimId,
            orderId: checkout.order.id,
            now,
          })
        : undefined;
    await courseAccessStore.save(userId, checkout.accessState);
    if (nextPreference) await saveUserPreferenceForUser(nextPreference);

    return {
      status: 200,
      body: checkoutOrderPayload(checkout),
    } as const;
  } catch (err) {
    return checkoutActionFailure(err, "课程支付失败");
  }
}

export async function cancelCourseCheckoutOrderPayload(
  orderId: string,
  userId = LOCAL_COURSE_ACCESS_USER_ID,
  now = new Date().toISOString()
) {
  try {
    const currentState = await courseAccessStore.load(userId);
    const checkout = cancelCourseCheckoutOrder(currentState, orderId, now);
    await courseAccessStore.save(userId, checkout.accessState);

    return {
      status: 200,
      body: checkoutOrderPayload(checkout),
    } as const;
  } catch (err) {
    return checkoutActionFailure(err, "课程订单取消失败");
  }
}

export async function activateMembershipPayload(
  userId = LOCAL_COURSE_ACCESS_USER_ID
) {
  const currentState = await courseAccessStore.load(userId);
  const nextState = activateCourseMembership(currentState);
  await courseAccessStore.save(userId, nextState);

  return {
    status: 200,
    body: statePayload(nextState),
  } as const;
}

export function registerCourseAccessApi(app: Express) {
  app.get("/api/course-access", async (req: Request, res: Response) => {
    sendJson(
      res,
      200,
      await getCourseAccessPayload(await resolveRequestUserId(req))
    );
  });

  app.post(
    "/api/course-access/checkout/orders",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await createCourseCheckoutOrderPayload(
        req.body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.get(
    "/api/course-access/checkout/orders/:orderId",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await getCourseCheckoutOrderPayload(
        req.params.orderId,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/course-access/checkout/orders/:orderId/pay",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await payCourseCheckoutOrderPayload(
        req.params.orderId,
        req.body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/course-access/checkout/orders/:orderId/cancel",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await cancelCourseCheckoutOrderPayload(
        req.params.orderId,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/course-access/purchases",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const parsed = PurchaseCourseRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        sendJson(res, 400, errorPayload("BAD_REQUEST", "课程购买参数不合法"));
        return;
      }

      const payload = await purchaseCoursePayload(
        parsed.data.courseId,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    }
  );

  app.post(
    "/api/course-access/membership",
    async (req: Request, res: Response) => {
      const auth = await authorizeRequest(req, "membership:activate");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await activateMembershipPayload(auth.session.user.id);
      sendJson(res, payload.status, payload.body);
    }
  );
}

export function handleCourseAccessApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): boolean {
  if (!req.url || !req.url.startsWith("/api/course-access")) return false;

  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/api/course-access") {
    void resolveRequestUserId(req)
      .then(userId => getCourseAccessPayload(userId))
      .then(payload => sendJson(res, 200, payload))
      .catch(err => {
        console.error(err instanceof Error ? err.message : "课程权益读取失败");
        sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程权益读取失败"));
      });
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/course-access/checkout/orders"
  ) {
    void (async () => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const body = await readRequestBody(req);
      const payload = await createCourseCheckoutOrderPayload(
        body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "课程订单创建失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程订单创建失败"));
    });
    return true;
  }

  const checkoutOrderMatch = url.pathname.match(
    /^\/api\/course-access\/checkout\/orders\/([^/]+)$/
  );
  if (req.method === "GET" && checkoutOrderMatch?.[1]) {
    void (async () => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await getCourseCheckoutOrderPayload(
        decodeURIComponent(checkoutOrderMatch[1]),
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "课程订单读取失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程订单读取失败"));
    });
    return true;
  }

  const checkoutPayMatch = url.pathname.match(
    /^\/api\/course-access\/checkout\/orders\/([^/]+)\/pay$/
  );
  if (req.method === "POST" && checkoutPayMatch?.[1]) {
    void (async () => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const body = await readRequestBody(req);
      const payload = await payCourseCheckoutOrderPayload(
        decodeURIComponent(checkoutPayMatch[1]),
        body,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "课程支付失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程支付失败"));
    });
    return true;
  }

  const checkoutCancelMatch = url.pathname.match(
    /^\/api\/course-access\/checkout\/orders\/([^/]+)\/cancel$/
  );
  if (req.method === "POST" && checkoutCancelMatch?.[1]) {
    void (async () => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await cancelCourseCheckoutOrderPayload(
        decodeURIComponent(checkoutCancelMatch[1]),
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "课程订单取消失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程订单取消失败"));
    });
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/course-access/membership"
  ) {
    void (async () => {
      const auth = await authorizeRequest(req, "membership:activate");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const payload = await activateMembershipPayload(auth.session.user.id);
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "会员权益开通失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "会员权益开通失败"));
    });
    return true;
  }

  if (
    req.method === "POST" &&
    url.pathname === "/api/course-access/purchases"
  ) {
    void (async () => {
      const auth = await authorizeRequest(req, "course:purchase");
      if (!auth.ok) {
        sendJson(res, auth.status, auth.body);
        return;
      }

      const body = await readRequestBody(req);
      const parsed = PurchaseCourseRequestSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(res, 400, errorPayload("BAD_REQUEST", "课程购买参数不合法"));
        return;
      }

      const payload = await purchaseCoursePayload(
        parsed.data.courseId,
        auth.session.user.id
      );
      sendJson(res, payload.status, payload.body);
    })().catch(err => {
      console.error(err instanceof Error ? err.message : "课程购买失败");
      sendJson(res, 500, errorPayload("INTERNAL_ERROR", "课程购买失败"));
    });
    return true;
  }

  sendJson(res, 405, errorPayload("BAD_REQUEST", "不支持的请求方法"));
  return true;
}
