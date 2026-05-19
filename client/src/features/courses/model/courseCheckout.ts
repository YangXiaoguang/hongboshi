import {
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
  defaultCourseMembershipProduct,
  getPrimaryCourseMembershipPlan,
  type Course,
  type CourseMarketingRule,
  type CourseMembershipPlan,
  type CourseMembershipProduct,
  type PaymentChannel,
} from "@shared/domain";
import {
  createCoursePromotionSummary,
  type CoursePromotionTone,
} from "./coursePromotion";

export type CourseCheckoutMode = "course" | "membership";

export type CourseCheckoutPaymentChannel = PaymentChannel;

export interface CourseCheckoutLineItem {
  label: string;
  value: string;
}

export interface CourseCheckoutPromotionItem extends CourseCheckoutLineItem {
  description: string;
  tone: CoursePromotionTone;
}

export interface CourseCheckoutSummary {
  mode: CourseCheckoutMode;
  productTitle: string;
  productSubtitle: string;
  listPrice: number;
  originalPrice: number;
  discountAmount: number;
  payableAmount: number;
  savingsAmount: number;
  accessLabel: string;
  promotionItems: CourseCheckoutPromotionItem[];
  deliveryItems: CourseCheckoutLineItem[];
  protectionItems: CourseCheckoutLineItem[];
  notices: string[];
}

export interface CoursePaymentMethod {
  channel: CourseCheckoutPaymentChannel;
  label: string;
  description: string;
}

interface CreateCourseCheckoutSummaryOptions {
  marketingRules?: CourseMarketingRule[];
  membershipContext?: "course" | "standalone";
  membershipProduct?: CourseMembershipProduct;
}

export const COURSE_MEMBERSHIP_CHECKOUT_PRICE =
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE;
export const COURSE_MEMBERSHIP_CHECKOUT_ORIGINAL_PRICE =
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE;

export const coursePaymentMethods: CoursePaymentMethod[] = [
  {
    channel: "wechat_pay",
    label: "微信支付",
    description: "适合移动端快速确认",
  },
  {
    channel: "alipay",
    label: "支付宝",
    description: "支持常规账户支付",
  },
  {
    channel: "manual",
    label: "人工确认",
    description: "开发期模拟支付回执",
  },
];

export function formatCheckoutMoney(amount: number): string {
  return `¥${amount.toFixed(amount % 1 === 0 ? 0 : 1)}`;
}

function createCoursePromotionItems(
  course: Course,
  options: CreateCourseCheckoutSummaryOptions = {}
): CourseCheckoutPromotionItem[] {
  return createCoursePromotionSummary(course, {
    marketingRules: options.marketingRules,
  }).checkoutPromotionLines.map(line => ({
    label: line.label,
    value:
      line.amountLabel ??
      (line.amount ? `-${formatCheckoutMoney(line.amount)}` : "已包含"),
    description: line.title,
    tone: line.tone,
  }));
}

function calculateMembershipPlanPricing(plan: CourseMembershipPlan) {
  const listPrice = Math.max(0, plan.originalPrice);
  const payableAmount = Math.max(0, plan.payablePrice);
  const discountAmount = Math.max(0, listPrice - payableAmount);

  return {
    listPrice,
    originalPrice: listPrice,
    discountAmount,
    payableAmount,
    savingsAmount: discountAmount,
  };
}

function createMembershipPromotionItems(
  product: CourseMembershipProduct = defaultCourseMembershipProduct
): CourseCheckoutPromotionItem[] {
  const plan = getPrimaryCourseMembershipPlan(product);
  const pricing = calculateMembershipPlanPricing(plan);

  return [
    {
      label: `${plan.title}优惠`,
      value: `-${formatCheckoutMoney(pricing.discountAmount)}`,
      description: "成长会员当前活动价，支付后写入会员权益。",
      tone: "member",
    },
  ];
}

function createCourseDeliveryItems(course: Course): CourseCheckoutLineItem[] {
  return [
    { label: "课程内容", value: `${course.type}课程` },
    { label: "学习记录", value: "章节进度与练习档案" },
    { label: "阶段证明", value: "完成后生成预览" },
  ];
}

function createProtectionItems(course: Course): CourseCheckoutLineItem[] {
  return [
    { label: "有效期", value: "购买后长期可学" },
    { label: "隐私", value: "学习记录仅自己可见" },
    {
      label: "支持",
      value: course.isVip ? "会员权益可覆盖" : "可衔接咨询支持",
    },
  ];
}

export function createStandaloneMembershipCheckoutSummary(
  product: CourseMembershipProduct = defaultCourseMembershipProduct
): CourseCheckoutSummary {
  const plan = getPrimaryCourseMembershipPlan(product);
  const pricing = calculateMembershipPlanPricing(plan);

  return {
    mode: "membership",
    productTitle: plan.title,
    productSubtitle: product.description,
    listPrice: pricing.listPrice,
    originalPrice: pricing.originalPrice,
    discountAmount: pricing.discountAmount,
    payableAmount: pricing.payableAmount,
    savingsAmount: pricing.savingsAmount,
    accessLabel: "开通后会员课可直接学习",
    promotionItems: createMembershipPromotionItems(product),
    deliveryItems: plan.benefits.map(benefit => ({
      label: benefit.title,
      value: benefit.description,
    })),
    protectionItems: plan.protections.map(protection => ({
      label: protection.title,
      value: protection.description,
    })),
    notices: plan.notices,
  };
}

export function createCourseCheckoutSummary(
  course: Course,
  mode: CourseCheckoutMode,
  options: CreateCourseCheckoutSummaryOptions = {}
): CourseCheckoutSummary {
  if (mode === "membership") {
    const standalone = options.membershipContext === "standalone";
    const summary = createStandaloneMembershipCheckoutSummary(
      options.membershipProduct
    );

    return standalone
      ? summary
      : {
          ...summary,
          productSubtitle: `含本课学习权益：${course.title}`,
        };
  }

  const promotion = createCoursePromotionSummary(course, {
    marketingRules: options.marketingRules,
  });

  return {
    mode,
    productTitle: course.title,
    productSubtitle: `${course.teacher} · ${course.category} · ${course.type}`,
    listPrice: promotion.courseListAmount,
    originalPrice: promotion.courseOriginalAmount,
    discountAmount: promotion.courseCouponAmount,
    payableAmount: promotion.coursePayableAmount,
    savingsAmount: promotion.courseSavingsAmount,
    accessLabel: course.isFree ? "免费课程可直接学习" : "购买后解锁本课",
    promotionItems: createCoursePromotionItems(course, options),
    deliveryItems: createCourseDeliveryItems(course),
    protectionItems: createProtectionItems(course),
    notices: [
      "当前为开发期支付确认，确认后会写入课程权益。",
      "正式支付渠道接入后，课程权益将以支付成功回调为准。",
    ],
  };
}
