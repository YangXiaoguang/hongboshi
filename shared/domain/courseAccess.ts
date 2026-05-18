import { z } from "zod";
import {
  CourseAccessStatusSchema,
  type Course,
  type CourseAccessStatus,
} from "./course";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  LegacyNumericIdSchema,
  MoneyAmountSchema,
} from "./common";
import {
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
  COURSE_MEMBERSHIP_ORDER_TARGET_ID,
  COURSE_MEMBERSHIP_ORDER_TITLE,
  calculateCoursePricing,
  calculateMembershipPricing,
} from "./coursePricing";
import {
  OrderSchema,
  PaymentChannelSchema,
  closeUnpaidOrder,
  markOrderPaid,
  type Order,
  type PaymentChannel,
} from "./order";

export const LOCAL_COURSE_ACCESS_USER_ID = "local-user";
export const COURSE_ACCESS_USER_ID_HEADER = "x-hongboshi-user-id";
export const COURSE_CHECKOUT_PAYMENT_HOLD_MINUTES = 30;
export {
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
  COURSE_MEMBERSHIP_ORDER_TARGET_ID,
  COURSE_MEMBERSHIP_ORDER_TITLE,
} from "./coursePricing";

const MembershipStatusSchema = z.enum(["none", "active", "expired"]);

export const CourseMembershipSchema = z.object({
  status: MembershipStatusSchema.default("none"),
  planName: z.string().min(1).optional(),
  activatedAt: DateTimeLikeSchema.optional(),
  expiresAt: DateTimeLikeSchema.optional(),
});

export const CourseAccessStateSchema = z.object({
  ownedCourseIds: z.array(LegacyNumericIdSchema).default([]),
  membership: CourseMembershipSchema.default({ status: "none" }),
  orders: z.array(OrderSchema).default([]),
});

export const CourseCheckoutModeSchema = z.enum(["course", "membership"]);
export const CourseCheckoutEntitlementStatusSchema = z.enum([
  "pending",
  "delivered",
  "not_delivered",
]);
export const CourseCheckoutPaymentSchema = z.object({
  channel: PaymentChannelSchema.optional(),
  payableAmount: MoneyAmountSchema,
  expiresAt: DateTimeLikeSchema,
  holdMinutes: z.number().int().positive(),
});
export const CourseCheckoutEntitlementSchema = z.object({
  status: CourseCheckoutEntitlementStatusSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  deliveredAt: DateTimeLikeSchema.optional(),
});
export const CourseCheckoutOrderResultSchema = z.object({
  order: OrderSchema,
  mode: CourseCheckoutModeSchema,
  payment: CourseCheckoutPaymentSchema,
  entitlement: CourseCheckoutEntitlementSchema,
  accessState: CourseAccessStateSchema,
});
export const CourseCheckoutCreateRequestSchema = z.object({
  mode: CourseCheckoutModeSchema,
  courseId: LegacyNumericIdSchema,
  couponClaimId: EntityIdSchema.optional(),
});
export const CourseCheckoutPayRequestSchema = z.object({
  paymentChannel: PaymentChannelSchema.default("manual"),
  simulateResult: z.enum(["success", "failed"]).default("success"),
});

export type CourseMembership = z.infer<typeof CourseMembershipSchema>;
export type CourseAccessState = z.infer<typeof CourseAccessStateSchema>;
export type CourseCheckoutMode = z.infer<typeof CourseCheckoutModeSchema>;
export type CourseCheckoutOrderResult = z.infer<
  typeof CourseCheckoutOrderResultSchema
>;
export type CourseCheckoutCreateRequest = z.infer<
  typeof CourseCheckoutCreateRequestSchema
>;
export type CourseCheckoutPayRequest = z.infer<
  typeof CourseCheckoutPayRequestSchema
>;

export interface CourseAccessResult {
  status: CourseAccessStatus;
  canStart: boolean;
  canPurchase: boolean;
  canActivateMembership: boolean;
}

export interface CourseCheckoutCouponApplicationInput {
  couponClaimId?: string;
  couponMarketingRuleId?: string;
}

export function createEmptyCourseAccessState(): CourseAccessState {
  return {
    ownedCourseIds: [],
    membership: {
      status: "none",
    },
    orders: [],
  };
}

export function normalizeCourseAccessState(state: unknown): CourseAccessState {
  const parsed = CourseAccessStateSchema.safeParse(state);
  if (!parsed.success) return createEmptyCourseAccessState();

  return {
    ownedCourseIds: Array.from(new Set(parsed.data.ownedCourseIds)),
    membership: parsed.data.membership,
    orders: parsed.data.orders,
  };
}

function checkoutDeadlineFrom(
  createdAt: string,
  holdMinutes = COURSE_CHECKOUT_PAYMENT_HOLD_MINUTES
): string {
  return new Date(
    Date.parse(createdAt) + holdMinutes * 60 * 1000
  ).toISOString();
}

function safeIdPart(value: string | number): string {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 32);
}

function createCourseCheckoutOrderId({
  mode,
  targetId,
  userId,
  now,
}: {
  mode: CourseCheckoutMode;
  targetId: string | number;
  userId: string;
  now: string;
}) {
  return `order_${mode}_${safeIdPart(targetId)}_${safeIdPart(userId)}_${Date.parse(now)}`;
}

function checkoutModeFromOrder(order: Order): CourseCheckoutMode {
  const itemType = order.items[0]?.type;
  if (itemType === "membership") return "membership";
  if (itemType === "course") return "course";
  throw new Error("CHECKOUT_ORDER_UNSUPPORTED_ITEM");
}

function findPendingCheckoutOrder(
  state: CourseAccessState,
  mode: CourseCheckoutMode,
  targetId: string
): Order | undefined {
  return state.orders.find(order => {
    if (order.status !== "pending_payment") return false;
    const firstItem = order.items[0];
    if (!firstItem) return false;
    if (mode === "membership") {
      return (
        firstItem.type === "membership" &&
        firstItem.targetId === COURSE_MEMBERSHIP_ORDER_TARGET_ID
      );
    }

    return firstItem.type === "course" && firstItem.targetId === targetId;
  });
}

export function findPendingCourseCheckoutOrder(
  state: CourseAccessState,
  course: Course,
  mode: CourseCheckoutMode
): CourseCheckoutOrderResult | undefined {
  const normalized = normalizeCourseAccessState(state);
  const targetId =
    mode === "membership"
      ? COURSE_MEMBERSHIP_ORDER_TARGET_ID
      : String(course.id);
  const pendingOrder = findPendingCheckoutOrder(normalized, mode, targetId);
  if (!pendingOrder) return undefined;

  return createCourseCheckoutOrderResult({
    state: normalized,
    order: pendingOrder,
  });
}

function entitlementForOrder(
  order: Order
): CourseCheckoutOrderResult["entitlement"] {
  const mode = checkoutModeFromOrder(order);
  const title =
    mode === "membership"
      ? COURSE_MEMBERSHIP_ORDER_TITLE
      : (order.items[0]?.title ?? "课程");

  if (order.status === "paid") {
    return {
      status: "delivered",
      title,
      description:
        mode === "membership"
          ? "会员权益已写入账户，会员课程可在有效期内学习。"
          : "课程权益已写入账户，可以立即加入学习计划。",
      deliveredAt: order.entitlementDeliveredAt ?? order.paidAt,
    };
  }

  if (order.status === "closed") {
    return {
      status: "not_delivered",
      title,
      description: "订单已关闭，未发放课程或会员权益。",
    };
  }

  return {
    status: "pending",
    title,
    description:
      mode === "membership"
        ? "支付成功后会自动开通成长会员。"
        : "支付成功后会自动解锁本课程。",
  };
}

export function createCourseCheckoutOrderResult({
  state,
  order,
  paymentChannel,
}: {
  state: CourseAccessState;
  order: Order;
  paymentChannel?: PaymentChannel;
}): CourseCheckoutOrderResult {
  const normalizedState = normalizeCourseAccessState(state);
  const normalizedOrder = OrderSchema.parse(order);

  return CourseCheckoutOrderResultSchema.parse({
    order: normalizedOrder,
    mode: checkoutModeFromOrder(normalizedOrder),
    payment: {
      channel: paymentChannel ?? normalizedOrder.paymentChannel,
      payableAmount: normalizedOrder.payableAmount,
      expiresAt:
        normalizedOrder.expiresAt ??
        checkoutDeadlineFrom(normalizedOrder.createdAt),
      holdMinutes: COURSE_CHECKOUT_PAYMENT_HOLD_MINUTES,
    },
    entitlement: entitlementForOrder(normalizedOrder),
    accessState: normalizedState,
  });
}

export function hasActiveCourseMembership(
  membership: CourseMembership,
  now = new Date().toISOString()
): boolean {
  if (membership.status !== "active") return false;
  if (!membership.expiresAt) return true;
  return Date.parse(membership.expiresAt) > Date.parse(now);
}

export function resolveCourseAccess(
  state: CourseAccessState,
  course: Course,
  now = new Date().toISOString()
): CourseAccessResult {
  const owned = state.ownedCourseIds.includes(course.id);
  const membershipActive = hasActiveCourseMembership(state.membership, now);
  let status: CourseAccessStatus;

  if (course.isFree) {
    status = "free";
  } else if (owned) {
    status = "owned";
  } else if (course.isVip && membershipActive) {
    status = "member_included";
  } else if (course.isVip) {
    status = "requires_membership";
  } else {
    status = "requires_purchase";
  }

  const parsedStatus = CourseAccessStatusSchema.parse(status);
  const canStart = ["free", "owned", "member_included"].includes(parsedStatus);

  return {
    status: parsedStatus,
    canStart,
    canPurchase: !course.isFree && !owned,
    canActivateMembership: course.isVip && !membershipActive,
  };
}

export function createCourseCheckoutOrder(
  state: CourseAccessState,
  course: Course,
  mode: CourseCheckoutMode,
  now = new Date().toISOString(),
  userId = LOCAL_COURSE_ACCESS_USER_ID,
  couponApplication?: CourseCheckoutCouponApplicationInput
): CourseCheckoutOrderResult {
  const normalized = normalizeCourseAccessState(state);
  const access = resolveCourseAccess(normalized, course, now);

  if (mode === "course") {
    if (course.isFree) throw new Error("COURSE_IS_FREE");
    if (!access.canPurchase) throw new Error("COURSE_NOT_PURCHASABLE");
  }

  if (mode === "membership" && access.canActivateMembership === false) {
    throw new Error("MEMBERSHIP_NOT_PURCHASABLE");
  }

  const targetId =
    mode === "membership"
      ? COURSE_MEMBERSHIP_ORDER_TARGET_ID
      : String(course.id);
  const existingOrder = findPendingCheckoutOrder(normalized, mode, targetId);

  const amount =
    mode === "membership"
      ? calculateMembershipPricing()
      : calculateCoursePricing(course);
  const orderCouponApplication =
    mode === "course" &&
    couponApplication?.couponClaimId &&
    couponApplication.couponMarketingRuleId
      ? {
          claimId: couponApplication.couponClaimId,
          marketingRuleId: couponApplication.couponMarketingRuleId,
          status: "reserved" as const,
          appliedAt: now,
        }
      : undefined;

  if (existingOrder) {
    const updatedOrder = OrderSchema.parse({
      ...existingOrder,
      couponApplication: orderCouponApplication,
    });
    const accessState =
      updatedOrder.couponApplication?.claimId ===
        existingOrder.couponApplication?.claimId &&
      updatedOrder.couponApplication?.marketingRuleId ===
        existingOrder.couponApplication?.marketingRuleId
        ? normalized
        : upsertCourseAccessOrder(normalized, updatedOrder);

    return createCourseCheckoutOrderResult({
      state: accessState,
      order: updatedOrder,
    });
  }

  const order = OrderSchema.parse({
    id: createCourseCheckoutOrderId({
      mode,
      targetId,
      userId,
      now,
    }),
    userId,
    status: "pending_payment",
    items:
      mode === "membership"
        ? [
            {
              type: "membership",
              targetId: COURSE_MEMBERSHIP_ORDER_TARGET_ID,
              title: COURSE_MEMBERSHIP_ORDER_TITLE,
              unitPrice: COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
              quantity: 1,
            },
          ]
        : [
            {
              type: "course",
              targetId: String(course.id),
              title: course.title,
              unitPrice: course.price,
              quantity: 1,
            },
          ],
    subtotal: amount.listPrice,
    discountAmount: amount.discountAmount,
    payableAmount: amount.payableAmount,
    couponApplication: orderCouponApplication,
    createdAt: now,
    expiresAt: checkoutDeadlineFrom(now),
  });
  const accessState = upsertCourseAccessOrder(normalized, order);

  return createCourseCheckoutOrderResult({
    state: accessState,
    order,
  });
}

function deliverCourseCheckoutEntitlement(
  state: CourseAccessState,
  order: Order,
  now: string
): CourseAccessState {
  const mode = checkoutModeFromOrder(order);
  if (mode === "membership") {
    return activateCourseMembership(state, now, COURSE_MEMBERSHIP_ORDER_TITLE);
  }

  const courseId = Number(order.items[0]?.targetId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    throw new Error("CHECKOUT_ORDER_INVALID_COURSE");
  }

  return normalizeCourseAccessState({
    ...state,
    ownedCourseIds: state.ownedCourseIds.includes(courseId)
      ? state.ownedCourseIds
      : [...state.ownedCourseIds, courseId],
  });
}

export function payCourseCheckoutOrder(
  state: CourseAccessState,
  orderId: string,
  paymentChannel: PaymentChannel = "manual",
  now = new Date().toISOString()
): CourseCheckoutOrderResult {
  const normalized = normalizeCourseAccessState(state);
  const currentOrder = findCourseAccessOrder(normalized, orderId);
  if (!currentOrder) throw new Error("CHECKOUT_ORDER_NOT_FOUND");
  if (!["created", "pending_payment", "paid"].includes(currentOrder.status)) {
    throw new Error("CHECKOUT_ORDER_NOT_PAYABLE");
  }

  const paidOrder = OrderSchema.parse({
    ...markOrderPaid(currentOrder, now),
    paymentChannel: currentOrder.paymentChannel ?? paymentChannel,
    entitlementDeliveredAt: currentOrder.entitlementDeliveredAt ?? now,
    couponApplication: currentOrder.couponApplication
      ? {
          ...currentOrder.couponApplication,
          status: "used",
          usedAt: currentOrder.couponApplication.usedAt ?? now,
        }
      : undefined,
  });
  const stateWithPaidOrder = upsertCourseAccessOrder(normalized, paidOrder);
  const accessState = deliverCourseCheckoutEntitlement(
    stateWithPaidOrder,
    paidOrder,
    paidOrder.entitlementDeliveredAt ?? now
  );

  return createCourseCheckoutOrderResult({
    state: accessState,
    order: paidOrder,
    paymentChannel: paidOrder.paymentChannel,
  });
}

export function cancelCourseCheckoutOrder(
  state: CourseAccessState,
  orderId: string,
  now = new Date().toISOString()
): CourseCheckoutOrderResult {
  const normalized = normalizeCourseAccessState(state);
  const currentOrder = findCourseAccessOrder(normalized, orderId);
  if (!currentOrder) throw new Error("CHECKOUT_ORDER_NOT_FOUND");

  const closedOrder = OrderSchema.parse({
    ...closeUnpaidOrder(currentOrder),
    closedAt: currentOrder.closedAt ?? now,
  });
  const accessState = upsertCourseAccessOrder(normalized, closedOrder);

  return createCourseCheckoutOrderResult({
    state: accessState,
    order: closedOrder,
  });
}

export function grantPurchasedCourseAccess(
  state: CourseAccessState,
  course: Course,
  now = new Date().toISOString(),
  userId = LOCAL_COURSE_ACCESS_USER_ID
): CourseAccessState {
  if (course.isFree || state.ownedCourseIds.includes(course.id)) {
    return normalizeCourseAccessState(state);
  }

  const amount = calculateCoursePricing(course);
  const order: Order = {
    id: `order_course_${course.id}_${Date.parse(now)}`,
    userId,
    status: "paid",
    items: [
      {
        type: "course",
        targetId: String(course.id),
        title: course.title,
        unitPrice: course.price,
        quantity: 1,
      },
    ],
    subtotal: course.price,
    discountAmount: amount.discountAmount,
    payableAmount: amount.payableAmount,
    createdAt: now,
    paidAt: now,
  };

  return normalizeCourseAccessState({
    ...state,
    ownedCourseIds: [...state.ownedCourseIds, course.id],
    orders: [OrderSchema.parse(order), ...state.orders],
  });
}

export function findCourseAccessOrder(
  state: CourseAccessState,
  orderId: string
): Order | undefined {
  const normalized = normalizeCourseAccessState(state);
  return normalized.orders.find(order => order.id === orderId);
}

export function upsertCourseAccessOrder(
  state: CourseAccessState,
  order: Order
): CourseAccessState {
  const normalized = normalizeCourseAccessState(state);
  const parsedOrder = OrderSchema.parse(order);

  return normalizeCourseAccessState({
    ...normalized,
    orders: [
      parsedOrder,
      ...normalized.orders.filter(item => item.id !== parsedOrder.id),
    ],
  });
}

export function activateCourseMembership(
  state: CourseAccessState,
  now = new Date().toISOString(),
  planName = "成长会员"
): CourseAccessState {
  const startedAt = Date.parse(now);
  const expiresAt = new Date(
    startedAt + 365 * 24 * 60 * 60 * 1000
  ).toISOString();

  return normalizeCourseAccessState({
    ...state,
    membership: {
      status: "active",
      planName,
      activatedAt: now,
      expiresAt,
    },
  });
}
