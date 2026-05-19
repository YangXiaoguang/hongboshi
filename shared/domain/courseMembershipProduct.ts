import { z } from "zod";
import {
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
} from "./coursePricing";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  MoneyAmountSchema,
} from "./common";

export const COURSE_MEMBERSHIP_PRODUCT_ID = "growth_membership";
export const COURSE_MEMBERSHIP_YEARLY_PLAN_ID = "growth_membership_yearly";
export const COURSE_MEMBERSHIP_PRODUCT_CONTRACT_VERSION = "2026.05";

export const CourseMembershipProductStatusSchema = z.enum([
  "active",
  "inactive",
]);

export const CourseMembershipProductAdminAuditActionSchema = z.enum([
  "product_update",
  "plan_update",
  "plan_status_update",
]);

const OptionalBadgeSchema = z.preprocess(value => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().trim().min(1).max(24).optional());

const OperationReasonSchema = z.string().trim().min(4).max(240);

export const CourseMembershipBenefitSchema = z.object({
  title: z.string().trim().min(1).max(40),
  description: z.string().trim().min(1).max(160),
});

export const CourseMembershipPlanSchema = z.object({
  id: EntityIdSchema,
  productId: EntityIdSchema,
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().min(1).max(120),
  planName: z.string().trim().min(1).max(40),
  badge: OptionalBadgeSchema,
  durationDays: z.number().int().positive().max(3650),
  originalPrice: MoneyAmountSchema,
  payablePrice: MoneyAmountSchema,
  status: CourseMembershipProductStatusSchema.default("active"),
  benefits: z.array(CourseMembershipBenefitSchema).min(1).max(8),
  audience: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
  protections: z.array(CourseMembershipBenefitSchema).min(1).max(8),
  notices: z.array(z.string().trim().min(1).max(140)).min(1).max(8),
  createdAt: DateTimeLikeSchema.optional(),
  updatedAt: DateTimeLikeSchema.optional(),
});

export const CourseMembershipProductSchema = z.object({
  id: EntityIdSchema,
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
  heroImageUrl: z.string().trim().url(),
  scopeLabel: z.string().trim().min(1).max(80),
  status: CourseMembershipProductStatusSchema.default("active"),
  courseScope: z.enum(["vip_courses"]),
  plans: z.array(CourseMembershipPlanSchema).min(1),
  createdAt: DateTimeLikeSchema.optional(),
  updatedAt: DateTimeLikeSchema.optional(),
});

export const CourseMembershipProductUpdateRequestSchema = z.object({
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(240),
  heroImageUrl: z.string().trim().url(),
  scopeLabel: z.string().trim().min(1).max(80),
  status: CourseMembershipProductStatusSchema,
  reason: OperationReasonSchema,
});

export const CourseMembershipPlanUpdateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    subtitle: z.string().trim().min(1).max(120),
    planName: z.string().trim().min(1).max(40),
    badge: OptionalBadgeSchema,
    durationDays: z.number().int().positive().max(3650),
    originalPrice: MoneyAmountSchema,
    payablePrice: MoneyAmountSchema,
    benefits: z.array(CourseMembershipBenefitSchema).min(1).max(8),
    audience: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
    protections: z.array(CourseMembershipBenefitSchema).min(1).max(8),
    notices: z.array(z.string().trim().min(1).max(140)).min(1).max(8),
    reason: OperationReasonSchema,
  })
  .superRefine((value, ctx) => {
    if (value.payablePrice <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["payablePrice"],
        message: "会员套餐售价必须大于 0",
      });
    }

    if (value.originalPrice < value.payablePrice) {
      ctx.addIssue({
        code: "custom",
        path: ["originalPrice"],
        message: "会员套餐原价不能低于售价",
      });
    }
  });

export const CourseMembershipPlanStatusUpdateRequestSchema = z.object({
  status: CourseMembershipProductStatusSchema,
  reason: OperationReasonSchema,
});

export const CourseMembershipProductAdminAuditEventSchema = z.object({
  id: EntityIdSchema,
  productId: EntityIdSchema,
  productTitle: z.string().trim().min(1).max(80),
  planId: EntityIdSchema.optional(),
  planTitle: z.string().trim().min(1).max(80).optional(),
  actorId: EntityIdSchema,
  actorRoles: z.array(z.string().min(1)).default([]),
  action: CourseMembershipProductAdminAuditActionSchema,
  reason: OperationReasonSchema,
  before: z.record(z.string(), z.unknown()),
  after: z.record(z.string(), z.unknown()),
  createdAt: DateTimeLikeSchema,
});

export const CourseMembershipProductAdminConsoleSchema = z.object({
  version: z
    .literal(COURSE_MEMBERSHIP_PRODUCT_CONTRACT_VERSION)
    .default(COURSE_MEMBERSHIP_PRODUCT_CONTRACT_VERSION),
  serverTime: DateTimeLikeSchema,
  product: CourseMembershipProductSchema,
  auditEvents: z
    .array(CourseMembershipProductAdminAuditEventSchema)
    .default([]),
});

export const CourseMembershipProductAdminMutationResultSchema = z.object({
  product: CourseMembershipProductSchema,
  auditEvent: CourseMembershipProductAdminAuditEventSchema,
  auditEvents: z.array(CourseMembershipProductAdminAuditEventSchema),
});

export const defaultCourseMembershipProduct =
  CourseMembershipProductSchema.parse({
    id: COURSE_MEMBERSHIP_PRODUCT_ID,
    title: "成长会员",
    subtitle: "会员课程与成长档案通行证",
    description:
      "适合希望持续学习心理课程、沉淀练习记录，并把课程权益集中管理在同一账号的用户。",
    heroImageUrl:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1800&q=86",
    scopeLabel: "覆盖平台会员课程",
    status: "active",
    courseScope: "vip_courses",
    createdAt: "2026-01-01T00:00:00+08:00",
    updatedAt: "2026-05-19T00:00:00+08:00",
    plans: [
      {
        id: COURSE_MEMBERSHIP_YEARLY_PLAN_ID,
        productId: COURSE_MEMBERSHIP_PRODUCT_ID,
        title: "成长会员年卡",
        subtitle: "365 天会员课程权益，适合连续学习与复习。",
        planName: "成长会员",
        badge: "当前主推",
        durationDays: 365,
        originalPrice: COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
        payablePrice: COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
        status: "active",
        benefits: [
          {
            title: "会员课程可学",
            description:
              "有效期内解锁平台会员课程，课程中心和成长空间同步展示。",
          },
          {
            title: "成长空间沉淀",
            description: "章节进度、练习记录和阶段证明预览沉淀在当前账号。",
          },
          {
            title: "测评与咨询衔接",
            description: "学习路径可继续衔接测评推荐和一对一咨询预约。",
          },
        ],
        audience: [
          "计划连续学习 2 门以上会员课程",
          "希望把练习记录和成长档案集中管理",
          "需要先用课程建立自助支持节奏",
        ],
        protections: [
          {
            title: "权益有效期",
            description: "支付确认后写入 365 天会员权益。",
          },
          {
            title: "隐私边界",
            description: "学习记录只进入本人账号和最小化运营摘要。",
          },
          {
            title: "售后承接",
            description: "订单、退款和售后处理仍由服务端状态机与后台审计驱动。",
          },
        ],
        notices: [
          "当前为开发期支付确认，确认后会写入会员权益。",
          "正式支付渠道接入后，会员权益将以支付成功回调为准。",
        ],
        createdAt: "2026-01-01T00:00:00+08:00",
        updatedAt: "2026-05-19T00:00:00+08:00",
      },
    ],
  });

export function getPrimaryCourseMembershipPlan(
  product: CourseMembershipProduct = defaultCourseMembershipProduct
): CourseMembershipPlan {
  const activePlan = product.plans.find(plan => plan.status === "active");
  return activePlan ?? product.plans[0];
}

export type CourseMembershipProductStatus = z.infer<
  typeof CourseMembershipProductStatusSchema
>;
export type CourseMembershipProductAdminAuditAction = z.infer<
  typeof CourseMembershipProductAdminAuditActionSchema
>;
export type CourseMembershipBenefit = z.infer<
  typeof CourseMembershipBenefitSchema
>;
export type CourseMembershipPlan = z.infer<typeof CourseMembershipPlanSchema>;
export type CourseMembershipProduct = z.infer<
  typeof CourseMembershipProductSchema
>;
export type CourseMembershipProductUpdateRequest = z.infer<
  typeof CourseMembershipProductUpdateRequestSchema
>;
export type CourseMembershipPlanUpdateRequest = z.infer<
  typeof CourseMembershipPlanUpdateRequestSchema
>;
export type CourseMembershipPlanStatusUpdateRequest = z.infer<
  typeof CourseMembershipPlanStatusUpdateRequestSchema
>;
export type CourseMembershipProductAdminAuditEvent = z.infer<
  typeof CourseMembershipProductAdminAuditEventSchema
>;
export type CourseMembershipProductAdminConsole = z.infer<
  typeof CourseMembershipProductAdminConsoleSchema
>;
export type CourseMembershipProductAdminMutationResult = z.infer<
  typeof CourseMembershipProductAdminMutationResultSchema
>;
