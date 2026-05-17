import {
  COURSE_MARKETING_RULE_VERSION,
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
  CourseMarketingRuleSchema,
  CourseSchema,
  type Course,
  type CourseMarketingRule,
} from "../../../shared/domain";
import {
  coursesFromPublishedProducts,
  getCourseProductStore,
  type CourseProductStore,
} from "../catalog/courseProductStore";

const PATH_BUNDLE_PREVIEW_DISCOUNT_RATE = 0.12;

export interface CourseMarketingRuleStore {
  listRules: (now?: string) => Promise<CourseMarketingRule[]>;
}

function dateTimeFromIsoDate(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function safeIdPart(value: string | number): string {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 40);
}

function ruleStatusFromEndTime(
  endsAt: string | undefined,
  now: string
): CourseMarketingRule["status"] {
  if (!endsAt) return "active";

  const endTime = Date.parse(endsAt);
  const nowTime = Date.parse(now);
  if (Number.isNaN(endTime) || Number.isNaN(nowTime)) return "paused";
  return endTime > nowTime ? "active" : "expired";
}

export function buildCourseMarketingRulesFromCourses(
  courses: Course[],
  now = new Date().toISOString()
): CourseMarketingRule[] {
  const courseRules = courses.flatMap(course => {
    const createdAt = dateTimeFromIsoDate(course.createdAt);
    const rules: CourseMarketingRule[] = [];

    if (course.coupon && course.coupon.amount > 0 && !course.isFree) {
      rules.push(
        CourseMarketingRuleSchema.parse({
          id: `course_${course.id}_coupon_${safeIdPart(course.coupon.label)}`,
          version: COURSE_MARKETING_RULE_VERSION,
          type: "course_coupon",
          status: "active",
          source: "course_product",
          name: course.coupon.label,
          description: `购买「${course.title}」时自动抵扣 ${course.coupon.amount} 元。`,
          badgeLabel: "券",
          priority: 300,
          stackable: true,
          scope: {
            courseIds: [course.id],
          },
          discount: {
            kind: "fixed_amount",
            amount: course.coupon.amount,
          },
          startsAt: createdAt,
          createdAt,
          updatedAt: now,
        })
      );
    }

    if (course.discount) {
      rules.push(
        CourseMarketingRuleSchema.parse({
          id: `course_${course.id}_limited_${safeIdPart(
            course.discount.label
          )}`,
          version: COURSE_MARKETING_RULE_VERSION,
          type: "limited_discount",
          status: ruleStatusFromEndTime(course.discount.endsAt, now),
          source: "course_product",
          name: course.discount.label,
          description: `「${course.title}」限时活动，当前课程标价已包含该活动。`,
          badgeLabel: "限时",
          priority: 220,
          stackable: true,
          scope: {
            courseIds: [course.id],
          },
          discount: {
            kind: "fixed_amount",
            amount: 0,
          },
          startsAt: createdAt,
          endsAt: course.discount.endsAt,
          createdAt,
          updatedAt: now,
        })
      );
    }

    return rules;
  });

  return [
    CourseMarketingRuleSchema.parse({
      id: "system_growth_membership_yearly_discount",
      version: COURSE_MARKETING_RULE_VERSION,
      type: "membership_discount",
      status: "active",
      source: "system",
      name: "成长会员年卡活动价",
      description: "成长会员年卡统一活动价，覆盖会员课程并沉淀学习档案。",
      badgeLabel: "会员",
      priority: 260,
      stackable: false,
      scope: {
        vipOnly: true,
      },
      discount: {
        kind: "fixed_price",
        originalAmount: COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
        payableAmount: COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
      },
      startsAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: now,
    }),
    CourseMarketingRuleSchema.parse({
      id: "system_path_bundle_preview",
      version: COURSE_MARKETING_RULE_VERSION,
      type: "path_bundle",
      status: "active",
      source: "system",
      name: "路径组合购预览",
      description: "按学习路径组合付费课程，当前仅作为组合购价格预览。",
      badgeLabel: "组合",
      priority: 180,
      stackable: false,
      scope: {},
      discount: {
        kind: "bundle_percentage",
        rate: PATH_BUNDLE_PREVIEW_DISCOUNT_RATE,
        minCourses: 2,
        maxCourses: 4,
      },
      startsAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: now,
    }),
    ...courseRules,
  ];
}

export class DerivedCourseMarketingRuleStore implements CourseMarketingRuleStore {
  constructor(private readonly productStore: CourseProductStore) {}

  async listRules(now = new Date().toISOString()) {
    const courses = coursesFromPublishedProducts(
      await this.productStore.listProducts()
    ).map(course => CourseSchema.parse(course));

    return buildCourseMarketingRulesFromCourses(courses, now);
  }
}

let courseMarketingRuleStore: CourseMarketingRuleStore | undefined;

export function createDefaultCourseMarketingRuleStore() {
  return new DerivedCourseMarketingRuleStore(getCourseProductStore());
}

export function getCourseMarketingRuleStore() {
  if (!courseMarketingRuleStore) {
    courseMarketingRuleStore = createDefaultCourseMarketingRuleStore();
  }
  return courseMarketingRuleStore;
}

export function setCourseMarketingRuleStore(store: CourseMarketingRuleStore) {
  courseMarketingRuleStore = store;
}
