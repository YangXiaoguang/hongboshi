import { z } from "zod";
import {
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
} from "./coursePricing";
import { EntityIdSchema, MoneyAmountSchema } from "./common";

export const COURSE_MEMBERSHIP_PRODUCT_ID = "growth_membership";
export const COURSE_MEMBERSHIP_YEARLY_PLAN_ID = "growth_membership_yearly";

export const CourseMembershipProductStatusSchema = z.enum([
  "active",
  "inactive",
]);

export const CourseMembershipBenefitSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const CourseMembershipPlanSchema = z.object({
  id: EntityIdSchema,
  productId: EntityIdSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  planName: z.string().min(1),
  badge: z.string().min(1).optional(),
  durationDays: z.number().int().positive(),
  originalPrice: MoneyAmountSchema,
  payablePrice: MoneyAmountSchema,
  status: CourseMembershipProductStatusSchema.default("active"),
  benefits: z.array(CourseMembershipBenefitSchema).min(1),
  audience: z.array(z.string().min(1)).min(1),
  protections: z.array(CourseMembershipBenefitSchema).min(1),
  notices: z.array(z.string().min(1)).min(1),
});

export const CourseMembershipProductSchema = z.object({
  id: EntityIdSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  description: z.string().min(1),
  heroImageUrl: z.string().url(),
  scopeLabel: z.string().min(1),
  courseScope: z.enum(["vip_courses"]),
  plans: z.array(CourseMembershipPlanSchema).min(1),
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
    courseScope: "vip_courses",
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
export type CourseMembershipBenefit = z.infer<
  typeof CourseMembershipBenefitSchema
>;
export type CourseMembershipPlan = z.infer<typeof CourseMembershipPlanSchema>;
export type CourseMembershipProduct = z.infer<
  typeof CourseMembershipProductSchema
>;
