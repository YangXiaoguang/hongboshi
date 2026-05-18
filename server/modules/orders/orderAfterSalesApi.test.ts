import { beforeEach, describe, expect, it } from "vitest";
import { CourseAccessStateSchema, type Order } from "../../../shared/domain";
import {
  InMemoryCourseAccessStore,
  type CourseAccessStore,
} from "../courses/courseAccessStore";
import { setCourseAccessStore } from "../courses/courseAccessApi";
import {
  createOrderAfterSalesRequestPayload,
  getOrderAfterSalesRequestsPayload,
  listOrderAfterSalesSummariesForOrder,
} from "./orderAfterSalesApi";
import {
  InMemoryOrderAfterSalesStore,
  setOrderAfterSalesStore,
  type OrderAfterSalesStore,
} from "./orderAfterSalesStore";

const userId = "u_after_sales_1";
const paidOrder: Order = {
  id: "order_course_after_sales_1",
  userId,
  status: "paid",
  items: [
    {
      type: "course",
      targetId: "16",
      title: "情绪急救手册",
      unitPrice: 149,
      quantity: 1,
    },
  ],
  subtotal: 149,
  discountAmount: 20,
  payableAmount: 129,
  createdAt: "2026-05-18T09:00:00.000Z",
  paidAt: "2026-05-18T09:02:00.000Z",
  entitlementDeliveredAt: "2026-05-18T09:02:00.000Z",
};

let courseAccessStore: CourseAccessStore;
let afterSalesStore: OrderAfterSalesStore;

beforeEach(async () => {
  courseAccessStore = new InMemoryCourseAccessStore();
  afterSalesStore = new InMemoryOrderAfterSalesStore();
  setCourseAccessStore(courseAccessStore);
  setOrderAfterSalesStore(afterSalesStore);

  await courseAccessStore.save(
    userId,
    CourseAccessStateSchema.parse({
      ownedCourseIds: [16],
      membership: { status: "none" },
      orders: [paidOrder],
    })
  );
});

describe("order after-sales api payloads", () => {
  it("creates a user-owned after-sales request without changing order status", async () => {
    const created = await createOrderAfterSalesRequestPayload(
      paidOrder.id,
      {
        requestType: "learning_access_issue",
        description: "课程无法进入学习页，请协助确认权益。",
        contact: "13800139019",
      },
      userId,
      "2026-05-18T10:00:00.000Z",
      afterSalesStore
    );

    expect(created.status).toBe(200);
    expect(created.body.ok).toBe(true);
    if (!created.body.ok) return;
    expect(created.body.data.request).toMatchObject({
      orderId: paidOrder.id,
      userId,
      requestType: "learning_access_issue",
      status: "submitted",
    });
    expect(created.body.data.summaries[0]).toMatchObject({
      contactMasked: "138****9019",
    });

    const state = await courseAccessStore.load(userId);
    expect(state.orders[0]?.status).toBe("paid");
  });

  it("lists active requests and rejects duplicate active submissions", async () => {
    await createOrderAfterSalesRequestPayload(
      paidOrder.id,
      {
        requestType: "refund_consultation",
        description: "想了解退款流程和权益处理方式。",
        contact: "user@example.com",
      },
      userId,
      "2026-05-18T10:00:00.000Z",
      afterSalesStore
    );

    const list = await getOrderAfterSalesRequestsPayload(
      paidOrder.id,
      userId,
      "2026-05-18T10:01:00.000Z",
      afterSalesStore
    );
    const duplicate = await createOrderAfterSalesRequestPayload(
      paidOrder.id,
      {
        requestType: "duplicate_payment",
        description: "再次提交重复扣款问题。",
        contact: "13800139019",
      },
      userId,
      "2026-05-18T10:02:00.000Z",
      afterSalesStore
    );

    expect(list.status).toBe(200);
    expect(list.body.ok).toBe(true);
    if (list.body.ok) {
      expect(list.body.data.activeRequest?.status).toBe("submitted");
    }
    expect(duplicate.status).toBe(409);
  });

  it("rejects non-owned and unpaid orders", async () => {
    const nonOwned = await createOrderAfterSalesRequestPayload(
      paidOrder.id,
      {
        requestType: "other",
        description: "不是我的订单。",
        contact: "13800139019",
      },
      "u_other",
      "2026-05-18T10:00:00.000Z",
      afterSalesStore
    );

    await courseAccessStore.save(
      userId,
      CourseAccessStateSchema.parse({
        ownedCourseIds: [],
        membership: { status: "none" },
        orders: [{ ...paidOrder, id: "order_pending_1", status: "pending_payment" }],
      })
    );
    const unpaid = await createOrderAfterSalesRequestPayload(
      "order_pending_1",
      {
        requestType: "other",
        description: "未支付订单测试。",
        contact: "13800139019",
      },
      userId,
      "2026-05-18T10:00:00.000Z",
      afterSalesStore
    );

    expect(nonOwned.status).toBe(404);
    expect(unpaid.status).toBe(409);
  });

  it("exposes masked summaries for admin and transaction projections", async () => {
    await createOrderAfterSalesRequestPayload(
      paidOrder.id,
      {
        requestType: "duplicate_payment",
        description: "我看到支付渠道可能出现了两笔扣款。",
        contact: "service@example.com",
      },
      userId,
      "2026-05-18T10:00:00.000Z",
      afterSalesStore
    );

    const summaries = await listOrderAfterSalesSummariesForOrder(
      paidOrder.id,
      afterSalesStore
    );

    expect(summaries[0]).toMatchObject({
      requestType: "duplicate_payment",
      contactMasked: "s***@example.com",
    });
    expect(summaries[0]?.descriptionPreview).toContain("支付渠道");
  });
});
