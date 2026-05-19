import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { defaultCourseMembershipProduct } from "../../../shared/domain";
import {
  InMemoryCourseMembershipProductStore,
  JsonFileCourseMembershipProductStore,
  updateCourseMembershipPlan,
  updateCourseMembershipPlanStatus,
  updateCourseMembershipProduct,
} from "./courseMembershipProductStore";

describe("course membership product store", () => {
  it("updates product information and records audit events", async () => {
    const store = new InMemoryCourseMembershipProductStore();

    const result = await updateCourseMembershipProduct({
      request: {
        title: "成长会员 Pro",
        subtitle: defaultCourseMembershipProduct.subtitle,
        description: defaultCourseMembershipProduct.description,
        heroImageUrl: defaultCourseMembershipProduct.heroImageUrl,
        scopeLabel: defaultCourseMembershipProduct.scopeLabel,
        status: "active",
        reason: "会员商品名称升级",
      },
      actorId: "operator_1",
      actorRoles: ["operator"],
      store,
      now: "2026-05-19T10:00:00.000Z",
    });

    expect(result.product.title).toBe("成长会员 Pro");
    expect(result.auditEvent).toMatchObject({
      action: "product_update",
      actorId: "operator_1",
    });
    expect((await store.listAuditEvents())[0]?.reason).toBe("会员商品名称升级");
  });

  it("updates plan price and pauses the plan with lifecycle audit", async () => {
    const store = new InMemoryCourseMembershipProductStore();
    const plan = defaultCourseMembershipProduct.plans[0]!;

    const priceResult = await updateCourseMembershipPlan({
      planId: plan.id,
      request: {
        title: plan.title,
        subtitle: plan.subtitle,
        planName: plan.planName,
        badge: plan.badge,
        durationDays: plan.durationDays,
        originalPrice: 799,
        payablePrice: 399,
        benefits: plan.benefits,
        audience: plan.audience,
        protections: plan.protections,
        notices: plan.notices,
        reason: "春季会员活动价调整",
      },
      actorId: "operator_1",
      store,
      now: "2026-05-19T10:10:00.000Z",
    });

    expect(priceResult.product.plans[0]?.payablePrice).toBe(399);
    expect(priceResult.auditEvent.action).toBe("plan_update");

    const statusResult = await updateCourseMembershipPlanStatus({
      planId: plan.id,
      request: {
        status: "inactive",
        reason: "临时暂停会员套餐售卖",
      },
      actorId: "operator_2",
      actorRoles: ["operator"],
      store,
      now: "2026-05-19T10:20:00.000Z",
    });

    expect(statusResult.product.plans[0]?.status).toBe("inactive");
    expect(statusResult.auditEvent).toMatchObject({
      action: "plan_status_update",
      planId: plan.id,
    });
  });

  it("persists product and audit events to a json file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "membership-product-"));
    const filePath = path.join(dir, "product.json");
    const store = new JsonFileCourseMembershipProductStore(filePath);
    const plan = defaultCourseMembershipProduct.plans[0]!;

    await updateCourseMembershipPlanStatus({
      planId: plan.id,
      request: {
        status: "inactive",
        reason: "文件持久化状态验证",
      },
      actorId: "operator_1",
      store,
      now: "2026-05-19T10:30:00.000Z",
    });

    const reloaded = new JsonFileCourseMembershipProductStore(filePath);

    expect((await reloaded.getProduct()).plans[0]?.status).toBe("inactive");
    expect((await reloaded.listAuditEvents())[0]?.reason).toBe(
      "文件持久化状态验证"
    );
  });
});
