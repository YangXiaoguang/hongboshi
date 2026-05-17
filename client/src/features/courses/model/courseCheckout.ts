import {
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
  calculateMembershipPricing,
  type Course,
  type CourseMarketingRule,
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

function createMembershipPromotionItems(): CourseCheckoutPromotionItem[] {
  const pricing = calculateMembershipPricing();

  return [
    {
      label: "会员年卡优惠",
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

export function createCourseCheckoutSummary(
  course: Course,
  mode: CourseCheckoutMode,
  options: CreateCourseCheckoutSummaryOptions = {}
): CourseCheckoutSummary {
  if (mode === "membership") {
    const pricing = calculateMembershipPricing();

    return {
      mode,
      productTitle: "成长会员年卡",
      productSubtitle: `含本课学习权益：${course.title}`,
      listPrice: pricing.listPrice,
      originalPrice: pricing.originalPrice,
      discountAmount: pricing.discountAmount,
      payableAmount: pricing.payableAmount,
      savingsAmount: pricing.savingsAmount,
      accessLabel: "开通后会员课可直接学习",
      promotionItems: createMembershipPromotionItems(),
      deliveryItems: [
        { label: "会员课程", value: "会员内容有效期内可学" },
        { label: "学习档案", value: "统一沉淀课程记录" },
        { label: "成长空间", value: "集中管理课程权益" },
      ],
      protectionItems: [
        { label: "会员期", value: "365 天" },
        { label: "隐私", value: "学习记录仅自己可见" },
        { label: "支持", value: "可衔接测评与咨询" },
      ],
      notices: [
        "当前为开发期支付确认，确认后会写入会员权益。",
        "正式支付渠道接入后，权益将以支付成功回调为准。",
      ],
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
