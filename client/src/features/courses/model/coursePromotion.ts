import {
  COURSE_MEMBERSHIP_ORDER_TITLE,
  calculateCoursePricing,
  calculateMembershipPricing,
  type Course,
} from "@shared/domain";

export type CoursePromotionLineKind =
  | "price_markdown"
  | "coupon"
  | "limited_discount"
  | "membership_alternative"
  | "path_bundle";

export type CoursePromotionTone = "saving" | "member" | "bundle" | "neutral";

export interface CoursePromotionLine {
  kind: CoursePromotionLineKind;
  label: string;
  title: string;
  description: string;
  amount?: number;
  amountLabel?: string;
  applied: boolean;
  tone: CoursePromotionTone;
}

export type CoursePromotionOfferKind = "course" | "membership" | "path_bundle";

export interface CoursePromotionOffer {
  kind: CoursePromotionOfferKind;
  title: string;
  description: string;
  badge: string;
  ctaLabel: string;
  payableAmount: number;
  originalAmount: number;
  savingsAmount: number;
  isRecommended: boolean;
  isCheckoutReady: boolean;
}

export interface CoursePathBundlePromotion {
  title: string;
  description: string;
  courseCount: number;
  courseTitles: string[];
  listAmount: number;
  originalAmount: number;
  payableAmount: number;
  savingsAmount: number;
  bundleDiscountAmount: number;
  averageAmount: number;
}

export interface CoursePromotionSummary {
  coursePayableAmount: number;
  courseListAmount: number;
  courseOriginalAmount: number;
  courseCouponAmount: number;
  courseSavingsAmount: number;
  coursePriceMarkdownAmount: number;
  bestOffer: CoursePromotionOffer;
  offers: CoursePromotionOffer[];
  lines: CoursePromotionLine[];
  checkoutPromotionLines: CoursePromotionLine[];
  pathBundle?: CoursePathBundlePromotion;
}

interface CreateCoursePromotionSummaryOptions {
  pathCourses?: Course[];
  maxBundleCourses?: number;
  now?: string;
}

const PATH_BUNDLE_PREVIEW_DISCOUNT_RATE = 0.12;
const DEFAULT_PATH_BUNDLE_COURSE_LIMIT = 4;

function amountLabel(amount: number): string {
  if (amount <= 0) return "已包含";
  return `-¥${amount.toFixed(amount % 1 === 0 ? 0 : 1)}`;
}

function moneyLabel(amount: number): string {
  return `¥${amount.toFixed(amount % 1 === 0 ? 0 : 1)}`;
}

function isLimitedDiscountActive(course: Course, now: string): boolean {
  if (!course.discount?.endsAt) return false;
  const endTime = Date.parse(course.discount.endsAt);
  const nowTime = Date.parse(now);
  if (Number.isNaN(endTime) || Number.isNaN(nowTime)) return false;
  return endTime > nowTime;
}

function formatDiscountDeadline(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "活动期内";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function uniqueCourses(courses: Course[]): Course[] {
  const map = new Map<number, Course>();
  courses.forEach(course => {
    if (!map.has(course.id)) map.set(course.id, course);
  });
  return Array.from(map.values());
}

function createPathBundlePromotion(
  courses: Course[],
  maxBundleCourses: number
): CoursePathBundlePromotion | undefined {
  const paidCourses = uniqueCourses(courses)
    .filter(course => !course.isFree && course.price > 0)
    .slice(0, maxBundleCourses);
  if (paidCourses.length < 2) return undefined;

  const pricingList = paidCourses.map(calculateCoursePricing);
  const listAmount = pricingList.reduce(
    (total, pricing) => total + pricing.listPrice,
    0
  );
  const originalAmount = pricingList.reduce(
    (total, pricing) => total + pricing.originalPrice,
    0
  );
  const singlePayableAmount = pricingList.reduce(
    (total, pricing) => total + pricing.payableAmount,
    0
  );
  const bundleDiscountAmount = Math.min(
    Math.round(singlePayableAmount * PATH_BUNDLE_PREVIEW_DISCOUNT_RATE),
    Math.max(0, singlePayableAmount - paidCourses.length)
  );
  const payableAmount = Math.max(0, singlePayableAmount - bundleDiscountAmount);
  const savingsAmount = Math.max(0, originalAmount - payableAmount);

  return {
    title: "路径组合预览",
    description: `本课和接下来 ${paidCourses.length - 1} 门付费课一起学习，适合已经确定要连续推进的用户。`,
    courseCount: paidCourses.length,
    courseTitles: paidCourses.map(course => course.title),
    listAmount,
    originalAmount,
    payableAmount,
    savingsAmount,
    bundleDiscountAmount,
    averageAmount: payableAmount / paidCourses.length,
  };
}

function createCourseOffer(course: Course): CoursePromotionOffer {
  const pricing = calculateCoursePricing(course);

  if (course.isFree) {
    return {
      kind: "course",
      title: "免费学习本课",
      description: "无需支付即可开始学习，进度会进入成长空间。",
      badge: "免费",
      ctaLabel: "开始学习",
      payableAmount: 0,
      originalAmount: 0,
      savingsAmount: 0,
      isRecommended: false,
      isCheckoutReady: false,
    };
  }

  return {
    kind: "course",
    title: course.coupon ? "本课券后购买" : "单独购买本课",
    description: course.coupon
      ? `${course.coupon.label} 下单自动抵扣，支付后解锁本课。`
      : "只购买当前课程，支付后解锁本课学习权益。",
    badge: course.coupon ? "券后价" : "单课",
    ctaLabel: "购买本课",
    payableAmount: pricing.payableAmount,
    originalAmount: pricing.originalPrice,
    savingsAmount: pricing.savingsAmount,
    isRecommended: false,
    isCheckoutReady: !course.isFree,
  };
}

function createMembershipOffer(course: Course): CoursePromotionOffer {
  const pricing = calculateMembershipPricing();

  return {
    kind: "membership",
    title: COURSE_MEMBERSHIP_ORDER_TITLE,
    description: `开通后可学习本课，并继续覆盖更多会员课程。`,
    badge: "会员方案",
    ctaLabel: "开通会员",
    payableAmount: pricing.payableAmount,
    originalAmount: pricing.originalPrice,
    savingsAmount: pricing.savingsAmount,
    isRecommended: false,
    isCheckoutReady: course.isVip,
  };
}

function createPathBundleOffer(
  bundle: CoursePathBundlePromotion
): CoursePromotionOffer {
  return {
    kind: "path_bundle",
    title: bundle.title,
    description: `组合后约 ${moneyLabel(bundle.averageAmount)} / 门，后续可升级为真实路径包订单。`,
    badge: "组合购",
    ctaLabel: "查看路径组合",
    payableAmount: bundle.payableAmount,
    originalAmount: bundle.originalAmount,
    savingsAmount: bundle.savingsAmount,
    isRecommended: false,
    isCheckoutReady: false,
  };
}

export function createCoursePromotionSummary(
  course: Course,
  options: CreateCoursePromotionSummaryOptions = {}
): CoursePromotionSummary {
  const now = options.now ?? new Date().toISOString();
  const pricing = calculateCoursePricing(course);
  const membershipPricing = calculateMembershipPricing();
  const lines: CoursePromotionLine[] = [];

  if (pricing.priceMarkdownAmount > 0) {
    lines.push({
      kind: "price_markdown",
      label: "课程直降",
      title: "当前标价已低于原价",
      description: `原价 ${moneyLabel(pricing.originalPrice)}，当前标价 ${moneyLabel(pricing.listPrice)}。`,
      amount: pricing.priceMarkdownAmount,
      amountLabel: amountLabel(pricing.priceMarkdownAmount),
      applied: true,
      tone: "saving",
    });
  }

  if (pricing.couponAmount > 0 && course.coupon) {
    lines.push({
      kind: "coupon",
      label: course.coupon.label,
      title: "下单自动抵扣",
      description: "创建订单时自动计入优惠，无需额外领券。",
      amount: pricing.couponAmount,
      amountLabel: amountLabel(pricing.couponAmount),
      applied: true,
      tone: "saving",
    });
  }

  if (course.discount && isLimitedDiscountActive(course, now)) {
    lines.push({
      kind: "limited_discount",
      label: course.discount.label,
      title: "限时活动价",
      description: `活动截止 ${formatDiscountDeadline(course.discount.endsAt)}，当前标价已包含活动优惠。`,
      amountLabel: "已包含",
      applied: true,
      tone: "saving",
    });
  }

  if (course.isVip) {
    const cheaperThanCourse =
      membershipPricing.payableAmount <= pricing.payableAmount;
    lines.push({
      kind: "membership_alternative",
      label: COURSE_MEMBERSHIP_ORDER_TITLE,
      title: cheaperThanCourse ? "会员方案更划算" : "适合连续学习",
      description: cheaperThanCourse
        ? "会员价不高于本课券后价，还能覆盖更多会员课程。"
        : "如果计划继续学习会员课程，可优先考虑年卡权益。",
      amount: membershipPricing.payableAmount,
      amountLabel: moneyLabel(membershipPricing.payableAmount),
      applied: false,
      tone: "member",
    });
  }

  const pathBundle = createPathBundlePromotion(
    [course, ...(options.pathCourses ?? [])],
    options.maxBundleCourses ?? DEFAULT_PATH_BUNDLE_COURSE_LIMIT
  );

  if (pathBundle) {
    lines.push({
      kind: "path_bundle",
      label: "路径组合",
      title: "组合购预览",
      description: `本路径 ${pathBundle.courseCount} 门付费课一起规划，预计再省 ${moneyLabel(
        pathBundle.bundleDiscountAmount
      )}。`,
      amount: pathBundle.bundleDiscountAmount,
      amountLabel: amountLabel(pathBundle.bundleDiscountAmount),
      applied: false,
      tone: "bundle",
    });
  }

  const courseOffer = createCourseOffer(course);
  const offers: CoursePromotionOffer[] = [courseOffer];
  const membershipOffer = course.isVip
    ? createMembershipOffer(course)
    : undefined;
  if (membershipOffer) offers.push(membershipOffer);
  if (pathBundle) offers.push(createPathBundleOffer(pathBundle));

  const checkoutReadyOffers = offers.filter(offer => offer.isCheckoutReady);
  const recommendedOffer =
    checkoutReadyOffers.find(
      offer =>
        offer.kind === "membership" &&
        course.isVip &&
        offer.payableAmount <= courseOffer.payableAmount
    ) ?? courseOffer;
  const markedOffers = offers.map(offer => ({
    ...offer,
    isRecommended: offer.kind === recommendedOffer.kind,
  }));

  return {
    coursePayableAmount: pricing.payableAmount,
    courseListAmount: pricing.listPrice,
    courseOriginalAmount: pricing.originalPrice,
    courseCouponAmount: pricing.couponAmount,
    courseSavingsAmount: pricing.savingsAmount,
    coursePriceMarkdownAmount: pricing.priceMarkdownAmount,
    bestOffer: {
      ...recommendedOffer,
      isRecommended: true,
    },
    offers: markedOffers,
    lines,
    checkoutPromotionLines: lines.filter(
      line =>
        line.applied &&
        ["price_markdown", "coupon", "limited_discount"].includes(line.kind)
    ),
    pathBundle,
  };
}
