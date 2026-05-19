import { beforeEach, describe, expect, it } from "vitest";
import { defaultCourseMembershipProduct } from "../../../shared/domain";
import {
  createCourseCheckoutOrderPayload,
  resetCourseAccessStore,
} from "../courses/courseAccessApi";
import {
  getCourseMembershipProductSnapshotPayload,
  updateCourseMembershipPlanPayload,
  updateCourseMembershipPlanStatusPayload,
} from "./courseMembershipProductApi";
import { InMemoryCourseMembershipProductStore } from "./courseMembershipProductStore";

const operator = { id: "operator_1", roles: ["operator" as const] };
const yearlyPlan = defaultCourseMembershipProduct.plans[0]!;

function planUpdateRequest(
  override: Partial<{
    originalPrice: number;
    payablePrice: number;
    reason: string;
  }> = {}
) {
  return {
    title: yearlyPlan.title,
    subtitle: yearlyPlan.subtitle,
    planName: yearlyPlan.planName,
    badge: yearlyPlan.badge,
    durationDays: yearlyPlan.durationDays,
    originalPrice: override.originalPrice ?? yearlyPlan.originalPrice,
    payablePrice: override.payablePrice ?? yearlyPlan.payablePrice,
    benefits: yearlyPlan.benefits,
    audience: yearlyPlan.audience,
    protections: yearlyPlan.protections,
    notices: yearlyPlan.notices,
    reason: override.reason ?? "会员售卖状态回归验证",
  };
}

describe("course membership sales regression", () => {
  beforeEach(async () => {
    await resetCourseAccessStore();
  });

  it("keeps admin price changes aligned with public snapshots and checkout amounts", async () => {
    const store = new InMemoryCourseMembershipProductStore();

    const updated = await updateCourseMembershipPlanPayload(
      operator,
      yearlyPlan.id,
      planUpdateRequest({
        originalPrice: 899,
        payablePrice: 529,
        reason: "会员年卡活动价调整后验证前台金额同步",
      }),
      store,
      "2026-05-19T12:00:00.000Z"
    );
    const snapshot = await getCourseMembershipProductSnapshotPayload(
      store,
      "2026-05-19T12:01:00.000Z"
    );
    const checkout = await createCourseCheckoutOrderPayload(
      {
        mode: "membership",
        membershipProductId: defaultCourseMembershipProduct.id,
        membershipPlanId: yearlyPlan.id,
      },
      "u_member_price_regression",
      "2026-05-19T12:02:00.000Z",
      undefined,
      undefined,
      store
    );

    expect(updated.status).toBe(200);
    expect(snapshot.status).toBe(200);
    expect(checkout.status).toBe(200);
    expect(snapshot.body.ok).toBe(true);
    expect(checkout.body.ok).toBe(true);
    if (!snapshot.body.ok || !checkout.body.ok) return;

    expect(snapshot.body.data.product.plans[0]).toMatchObject({
      originalPrice: 899,
      payablePrice: 529,
      status: "active",
    });
    expect("auditEvents" in snapshot.body.data).toBe(false);
    expect(checkout.body.data.order).toMatchObject({
      subtotal: 899,
      discountAmount: 370,
      payableAmount: 529,
      items: [
        {
          type: "membership",
          targetId: yearlyPlan.id,
          title: yearlyPlan.title,
        },
      ],
    });
  });

  it("protects historical pending orders while pause and restore affect only new orders", async () => {
    const store = new InMemoryCourseMembershipProductStore();
    const historical = await createCourseCheckoutOrderPayload(
      {
        mode: "membership",
        membershipProductId: defaultCourseMembershipProduct.id,
        membershipPlanId: yearlyPlan.id,
      },
      "u_member_history_regression",
      "2026-05-19T13:00:00.000Z",
      undefined,
      undefined,
      store
    );
    if (!historical.body.ok) throw new Error("expected historical checkout");

    await updateCourseMembershipPlanPayload(
      operator,
      yearlyPlan.id,
      planUpdateRequest({
        originalPrice: 899,
        payablePrice: 529,
        reason: "历史待支付订单创建后调整会员价格",
      }),
      store,
      "2026-05-19T13:03:00.000Z"
    );
    await updateCourseMembershipPlanStatusPayload(
      operator,
      yearlyPlan.id,
      {
        status: "inactive",
        reason: "暂停售卖验证历史订单继续支付",
      },
      store,
      "2026-05-19T13:04:00.000Z"
    );

    const pausedSnapshot = await getCourseMembershipProductSnapshotPayload(
      store,
      "2026-05-19T13:05:00.000Z"
    );
    const continued = await createCourseCheckoutOrderPayload(
      {
        mode: "membership",
        membershipProductId: defaultCourseMembershipProduct.id,
        membershipPlanId: yearlyPlan.id,
      },
      "u_member_history_regression",
      "2026-05-19T13:06:00.000Z",
      undefined,
      undefined,
      store
    );
    const blocked = await createCourseCheckoutOrderPayload(
      {
        mode: "membership",
        membershipProductId: defaultCourseMembershipProduct.id,
        membershipPlanId: yearlyPlan.id,
      },
      "u_member_blocked_regression",
      "2026-05-19T13:07:00.000Z",
      undefined,
      undefined,
      store
    );

    expect(pausedSnapshot.status).toBe(409);
    expect(pausedSnapshot.body.ok).toBe(false);
    if (!pausedSnapshot.body.ok) {
      expect(pausedSnapshot.body.error).toMatchObject({
        code: "CONFLICT",
        message: "会员套餐已暂停，暂不可购买",
        details: { reason: "no_active_plan" },
      });
    }

    expect(continued.status).toBe(200);
    expect(continued.body.ok).toBe(true);
    if (!continued.body.ok) return;
    expect(continued.body.data.order.id).toBe(
      historical.body.data.order.id
    );
    expect(continued.body.data.order.payableAmount).toBe(
      historical.body.data.order.payableAmount
    );
    expect(continued.body.data.order.payableAmount).toBe(399);

    expect(blocked.status).toBe(409);
    expect(blocked.body.ok).toBe(false);

    await updateCourseMembershipPlanStatusPayload(
      operator,
      yearlyPlan.id,
      {
        status: "active",
        reason: "恢复售卖验证新订单使用当前会员价格",
      },
      store,
      "2026-05-19T13:08:00.000Z"
    );

    const restoredSnapshot = await getCourseMembershipProductSnapshotPayload(
      store,
      "2026-05-19T13:09:00.000Z"
    );
    const fresh = await createCourseCheckoutOrderPayload(
      {
        mode: "membership",
        membershipProductId: defaultCourseMembershipProduct.id,
        membershipPlanId: yearlyPlan.id,
      },
      "u_member_restored_regression",
      "2026-05-19T13:10:00.000Z",
      undefined,
      undefined,
      store
    );

    expect(restoredSnapshot.status).toBe(200);
    expect(restoredSnapshot.body.ok).toBe(true);
    expect(fresh.status).toBe(200);
    expect(fresh.body.ok).toBe(true);
    if (!restoredSnapshot.body.ok || !fresh.body.ok) return;
    expect(restoredSnapshot.body.data.product.plans[0]?.payablePrice).toBe(
      529
    );
    expect(fresh.body.data.order.payableAmount).toBe(529);
  });
});
