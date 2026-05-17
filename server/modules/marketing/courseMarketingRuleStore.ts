import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  COURSE_MARKETING_RULE_VERSION,
  COURSE_MEMBERSHIP_ORDER_ORIGINAL_PRICE,
  COURSE_MEMBERSHIP_ORDER_PAYABLE_PRICE,
  CourseMarketingAuditEventSchema,
  CourseMarketingRuleMutationResultSchema,
  CourseMarketingRuleSchema,
  CourseMarketingRuleStatusUpdateRequestSchema,
  CourseSchema,
  DateTimeLikeSchema,
  EntityIdSchema,
  type Course,
  type CourseMarketingAuditEvent,
  type CourseMarketingRule,
  type CourseMarketingRuleMutationResult,
  type CourseMarketingRuleStatusUpdateRequest,
} from "../../../shared/domain";
import {
  coursesFromPublishedProducts,
  getCourseProductStore,
  type CourseProductStore,
} from "../catalog/courseProductStore";

const PATH_BUNDLE_PREVIEW_DISCOUNT_RATE = 0.12;

const CourseMarketingRuleOperationalStatusSchema = z.enum(["active", "paused"]);

const CourseMarketingRuleStatusOverrideSchema = z.object({
  id: EntityIdSchema,
  status: CourseMarketingRuleOperationalStatusSchema,
  updatedAt: DateTimeLikeSchema,
});

const CourseMarketingRuleStoreFileSchema = z.object({
  version: z.literal(1),
  ruleOverrides: z.array(CourseMarketingRuleStatusOverrideSchema).default([]),
  auditEvents: z.array(CourseMarketingAuditEventSchema).default([]),
});

type CourseMarketingRuleStatusOverride = z.infer<
  typeof CourseMarketingRuleStatusOverrideSchema
>;
type CourseMarketingRuleStoreFile = z.infer<
  typeof CourseMarketingRuleStoreFileSchema
>;

export interface CourseMarketingRuleStore {
  listRules: (now?: string) => Promise<CourseMarketingRule[]>;
  getRule: (
    ruleId: string,
    now?: string
  ) => Promise<CourseMarketingRule | undefined>;
  saveRule: (rule: CourseMarketingRule) => Promise<CourseMarketingRule>;
  listAuditEvents: (ruleId?: string) => Promise<CourseMarketingAuditEvent[]>;
  appendAuditEvent: (
    event: CourseMarketingAuditEvent
  ) => Promise<CourseMarketingAuditEvent>;
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
  private readonly ruleOverrides = new Map<
    string,
    CourseMarketingRuleStatusOverride
  >();
  private auditEvents: CourseMarketingAuditEvent[] = [];

  constructor(private readonly productStore: CourseProductStore) {}

  async listRules(now = new Date().toISOString()) {
    return applyRuleOverrides(
      await listDerivedRules(this.productStore, now),
      Array.from(this.ruleOverrides.values())
    );
  }

  async getRule(ruleId: string, now = new Date().toISOString()) {
    const rule = (await this.listRules(now)).find(item => item.id === ruleId);
    return rule ? cloneRule(rule) : undefined;
  }

  async saveRule(rule: CourseMarketingRule) {
    const parsed = CourseMarketingRuleSchema.parse(rule);
    const override = ruleOverrideFromRule(parsed);
    this.ruleOverrides.set(override.id, cloneRuleOverride(override));
    return cloneRule(parsed);
  }

  async listAuditEvents(ruleId?: string) {
    const events = ruleId
      ? this.auditEvents.filter(event => event.ruleId === ruleId)
      : this.auditEvents;

    return events
      .map(cloneAuditEvent)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async appendAuditEvent(event: CourseMarketingAuditEvent) {
    const parsed = CourseMarketingAuditEventSchema.parse(event);
    this.auditEvents.unshift(cloneAuditEvent(parsed));
    return cloneAuditEvent(parsed);
  }
}

export class InMemoryCourseMarketingRuleStore extends DerivedCourseMarketingRuleStore {}

export class JsonFileCourseMarketingRuleStore implements CourseMarketingRuleStore {
  constructor(
    private readonly productStore: CourseProductStore,
    private readonly filePath = resolveCourseMarketingRuleStorePath()
  ) {}

  async listRules(now = new Date().toISOString()) {
    return applyRuleOverrides(
      await listDerivedRules(this.productStore, now),
      this.readFile().ruleOverrides
    );
  }

  async getRule(ruleId: string, now = new Date().toISOString()) {
    const rule = (await this.listRules(now)).find(item => item.id === ruleId);
    return rule ? cloneRule(rule) : undefined;
  }

  async saveRule(rule: CourseMarketingRule) {
    const parsed = CourseMarketingRuleSchema.parse(rule);
    const override = ruleOverrideFromRule(parsed);
    const file = this.readFile();
    const existingIndex = file.ruleOverrides.findIndex(
      item => item.id === override.id
    );

    if (existingIndex >= 0) {
      file.ruleOverrides[existingIndex] = override;
    } else {
      file.ruleOverrides.push(override);
    }

    this.writeFile(file);
    return cloneRule(parsed);
  }

  async listAuditEvents(ruleId?: string) {
    const events = ruleId
      ? this.readFile().auditEvents.filter(event => event.ruleId === ruleId)
      : this.readFile().auditEvents;

    return events
      .map(cloneAuditEvent)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async appendAuditEvent(event: CourseMarketingAuditEvent) {
    const parsed = CourseMarketingAuditEventSchema.parse(event);
    const file = this.readFile();
    file.auditEvents.unshift(parsed);
    this.writeFile(file);
    return cloneAuditEvent(parsed);
  }

  clear() {
    this.writeFile(emptyCourseMarketingRuleStoreFile());
  }

  private readFile(): CourseMarketingRuleStoreFile {
    if (!fs.existsSync(this.filePath))
      return emptyCourseMarketingRuleStoreFile();

    try {
      return normalizeCourseMarketingRuleStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyCourseMarketingRuleStoreFile();
    }
  }

  private writeFile(file: CourseMarketingRuleStoreFile) {
    const normalized = normalizeCourseMarketingRuleStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

let courseMarketingRuleStore: CourseMarketingRuleStore | undefined;

export function createDefaultCourseMarketingRuleStore() {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_MARKETING_RULE_STORE === "memory"
  ) {
    return new InMemoryCourseMarketingRuleStore(getCourseProductStore());
  }

  return new JsonFileCourseMarketingRuleStore(getCourseProductStore());
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

export async function updateCourseMarketingRuleStatus({
  ruleId,
  request,
  actorId,
  actorRoles = [],
  store = getCourseMarketingRuleStore(),
  now = new Date().toISOString(),
}: {
  ruleId: string;
  request: CourseMarketingRuleStatusUpdateRequest;
  actorId: string;
  actorRoles?: string[];
  store?: CourseMarketingRuleStore;
  now?: string;
}): Promise<CourseMarketingRuleMutationResult> {
  const parsedRequest =
    CourseMarketingRuleStatusUpdateRequestSchema.parse(request);
  const current = await store.getRule(ruleId, now);
  if (!current) throw new Error("COURSE_MARKETING_RULE_NOT_FOUND");

  assertRuleStatusTransitionAllowed(current, parsedRequest.status);

  const next = CourseMarketingRuleSchema.parse({
    ...current,
    status: parsedRequest.status,
    updatedAt: now,
  });
  const auditEvent = CourseMarketingAuditEventSchema.parse({
    id: createAuditEventId("status", ruleId, now),
    ruleId,
    ruleName: current.name,
    actorId,
    actorRoles,
    action: "rule_status_update",
    reason: parsedRequest.reason,
    before: {
      status: current.status,
      updatedAt: current.updatedAt,
    },
    after: {
      status: next.status,
      updatedAt: next.updatedAt,
    },
    createdAt: now,
  });

  const saved = await store.saveRule(next);
  const savedEvent = await store.appendAuditEvent(auditEvent);

  return CourseMarketingRuleMutationResultSchema.parse({
    rule: saved,
    auditEvent: savedEvent,
    auditEvents: await store.listAuditEvents(ruleId),
  });
}

export function resolveCourseMarketingRuleStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_MARKETING_RULE_FILE ??
      ".hongboshi-data/course-marketing-rules.json"
  );
}

async function listDerivedRules(productStore: CourseProductStore, now: string) {
  const courses = coursesFromPublishedProducts(
    await productStore.listProducts()
  ).map(course => CourseSchema.parse(course));

  return buildCourseMarketingRulesFromCourses(courses, now);
}

function applyRuleOverrides(
  rules: CourseMarketingRule[],
  overrides: CourseMarketingRuleStatusOverride[]
) {
  const overrideById = new Map(overrides.map(item => [item.id, item]));

  return rules.map(rule => {
    const override = overrideById.get(rule.id);
    if (!override) return cloneRule(rule);

    return CourseMarketingRuleSchema.parse({
      ...rule,
      status: rule.status === "expired" ? "expired" : override.status,
      updatedAt: override.updatedAt,
    });
  });
}

function assertRuleStatusTransitionAllowed(
  rule: CourseMarketingRule,
  targetStatus: CourseMarketingRuleStatusUpdateRequest["status"]
) {
  if (rule.status === "expired") {
    throw new Error("COURSE_MARKETING_RULE_EXPIRED");
  }

  if (rule.status === targetStatus) {
    throw new Error("COURSE_MARKETING_RULE_STATUS_UNCHANGED");
  }
}

function createAuditEventId(action: "status", ruleId: string, now: string) {
  return `audit_${action}_${safeIdPart(ruleId)}_${Date.parse(now) || Date.now()}`;
}

function ruleOverrideFromRule(
  rule: CourseMarketingRule
): CourseMarketingRuleStatusOverride {
  if (rule.status === "expired") {
    throw new Error("COURSE_MARKETING_RULE_EXPIRED");
  }

  return CourseMarketingRuleStatusOverrideSchema.parse({
    id: rule.id,
    status: rule.status,
    updatedAt: rule.updatedAt,
  });
}

function emptyCourseMarketingRuleStoreFile(): CourseMarketingRuleStoreFile {
  return {
    version: 1,
    ruleOverrides: [],
    auditEvents: [],
  };
}

function normalizeCourseMarketingRuleStoreFile(
  payload: unknown
): CourseMarketingRuleStoreFile {
  const parsed = CourseMarketingRuleStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyCourseMarketingRuleStoreFile();

  return {
    version: 1,
    ruleOverrides: parsed.data.ruleOverrides.map(override =>
      CourseMarketingRuleStatusOverrideSchema.parse(override)
    ),
    auditEvents: parsed.data.auditEvents.map(event =>
      CourseMarketingAuditEventSchema.parse(event)
    ),
  };
}

function cloneRule(rule: CourseMarketingRule) {
  return CourseMarketingRuleSchema.parse(JSON.parse(JSON.stringify(rule)));
}

function cloneRuleOverride(override: CourseMarketingRuleStatusOverride) {
  return CourseMarketingRuleStatusOverrideSchema.parse(
    JSON.parse(JSON.stringify(override))
  );
}

function cloneAuditEvent(event: CourseMarketingAuditEvent) {
  return CourseMarketingAuditEventSchema.parse(
    JSON.parse(JSON.stringify(event))
  );
}
