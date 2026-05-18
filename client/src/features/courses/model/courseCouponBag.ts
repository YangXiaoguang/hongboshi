import {
  listActiveCourseMarketingRulesForCourse,
  type Course,
  type CourseMarketingRule,
  type Order,
  type UserCouponClaim,
} from "@shared/domain";
import { formatCheckoutMoney } from "./courseCheckout";

export type CourseCheckoutCouponOptionStatus =
  | "available"
  | "used"
  | "expired";

export interface CourseCheckoutCouponOption {
  claimId: string;
  marketingRuleId: string;
  label: string;
  description: string;
  value: string;
  status: CourseCheckoutCouponOptionStatus;
  expiresAt?: string;
  usedOrderId?: string;
}

interface CourseCouponBagInput {
  course: Course;
  marketingRules: CourseMarketingRule[];
  couponClaims: UserCouponClaim[];
  now?: string;
}

function couponValue(rule: CourseMarketingRule): string {
  if (rule.discount.kind === "fixed_amount") {
    return `-${formatCheckoutMoney(rule.discount.amount)}`;
  }

  if (rule.discount.kind === "fixed_price") {
    return formatCheckoutMoney(rule.discount.payableAmount);
  }

  return "组合优惠";
}

function resolveClaimStatus(
  claim: UserCouponClaim,
  now: string
): CourseCheckoutCouponOptionStatus {
  if (claim.status === "used") return "used";
  if (claim.status === "expired") return "expired";
  if (claim.expiresAt && Date.parse(claim.expiresAt) <= Date.parse(now)) {
    return "expired";
  }

  return "available";
}

function activeCourseCouponRules({
  course,
  marketingRules,
  now = new Date().toISOString(),
}: Omit<CourseCouponBagInput, "couponClaims">): CourseMarketingRule[] {
  return listActiveCourseMarketingRulesForCourse({
    course,
    now,
    rules: marketingRules,
    type: "course_coupon",
  });
}

export function createCourseCheckoutCouponOptions({
  course,
  marketingRules,
  couponClaims,
  now = new Date().toISOString(),
}: CourseCouponBagInput): CourseCheckoutCouponOption[] {
  const ruleById = new Map(
    activeCourseCouponRules({ course, marketingRules, now }).map(rule => [
      rule.id,
      rule,
    ])
  );

  return couponClaims
    .flatMap((claim): CourseCheckoutCouponOption[] => {
      const rule = ruleById.get(claim.marketingRuleId);
      if (!rule) return [];

      const option: CourseCheckoutCouponOption = {
        claimId: claim.id,
        marketingRuleId: rule.id,
        label: rule.name,
        description: rule.description,
        value: couponValue(rule),
        status: resolveClaimStatus(claim, now),
      };
      if (claim.expiresAt) option.expiresAt = claim.expiresAt;
      if (claim.usedOrderId) option.usedOrderId = claim.usedOrderId;

      return [option];
    })
    .sort((left, right) => {
      const statusRank = { available: 0, used: 1, expired: 2 };
      return (
        statusRank[left.status] - statusRank[right.status] ||
        left.marketingRuleId.localeCompare(right.marketingRuleId)
      );
    });
}

export function countClaimableCourseCoupons({
  course,
  marketingRules,
  couponClaims,
  now = new Date().toISOString(),
}: CourseCouponBagInput): number {
  const claimedRuleIds = new Set(
    couponClaims.map(claim => claim.marketingRuleId)
  );

  return activeCourseCouponRules({ course, marketingRules, now }).filter(
    rule => !claimedRuleIds.has(rule.id)
  ).length;
}

export function resolveDefaultCheckoutCouponClaimId({
  options,
  order,
  selectedCouponClaimId,
}: {
  options: CourseCheckoutCouponOption[];
  order?: Order;
  selectedCouponClaimId?: string;
}): string | undefined {
  const orderClaimId = order?.couponApplication?.claimId;
  if (orderClaimId && options.some(option => option.claimId === orderClaimId)) {
    return orderClaimId;
  }

  if (
    selectedCouponClaimId &&
    options.some(
      option =>
        option.claimId === selectedCouponClaimId &&
        option.status === "available"
    )
  ) {
    return selectedCouponClaimId;
  }

  return options.find(option => option.status === "available")?.claimId;
}
