import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CourseMembershipPlanSchema,
  CourseMembershipPlanStatusUpdateRequestSchema,
  CourseMembershipPlanUpdateRequestSchema,
  CourseMembershipProductAdminAuditEventSchema,
  CourseMembershipProductAdminMutationResultSchema,
  CourseMembershipProductSchema,
  CourseMembershipProductUpdateRequestSchema,
  defaultCourseMembershipProduct,
  type CourseMembershipPlan,
  type CourseMembershipPlanStatusUpdateRequest,
  type CourseMembershipPlanUpdateRequest,
  type CourseMembershipProduct,
  type CourseMembershipProductAdminAuditEvent,
  type CourseMembershipProductAdminMutationResult,
  type CourseMembershipProductUpdateRequest,
} from "../../../shared/domain";

const CourseMembershipProductStoreFileSchema = z.object({
  version: z.literal(1),
  product: CourseMembershipProductSchema,
  auditEvents: z
    .array(CourseMembershipProductAdminAuditEventSchema)
    .default([]),
});

type CourseMembershipProductStoreFile = z.infer<
  typeof CourseMembershipProductStoreFileSchema
>;

export interface CourseMembershipProductStore {
  getProduct(): Promise<CourseMembershipProduct>;
  saveProduct(
    product: CourseMembershipProduct
  ): Promise<CourseMembershipProduct>;
  listAuditEvents(
    planId?: string
  ): Promise<CourseMembershipProductAdminAuditEvent[]>;
  appendAuditEvent(
    event: CourseMembershipProductAdminAuditEvent
  ): Promise<CourseMembershipProductAdminAuditEvent>;
}

export class InMemoryCourseMembershipProductStore implements CourseMembershipProductStore {
  private product: CourseMembershipProduct;
  private auditEvents: CourseMembershipProductAdminAuditEvent[] = [];

  constructor(
    product: CourseMembershipProduct = defaultCourseMembershipProduct
  ) {
    this.product = cloneProduct(product);
  }

  async getProduct() {
    return cloneProduct(this.product);
  }

  async saveProduct(product: CourseMembershipProduct) {
    const parsed = CourseMembershipProductSchema.parse(product);
    this.product = cloneProduct(parsed);
    return cloneProduct(parsed);
  }

  async listAuditEvents(planId?: string) {
    const events = planId
      ? this.auditEvents.filter(event => event.planId === planId)
      : this.auditEvents;
    return events
      .map(cloneAuditEvent)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async appendAuditEvent(event: CourseMembershipProductAdminAuditEvent) {
    const parsed = CourseMembershipProductAdminAuditEventSchema.parse(event);
    this.auditEvents.unshift(cloneAuditEvent(parsed));
    return cloneAuditEvent(parsed);
  }
}

export class JsonFileCourseMembershipProductStore implements CourseMembershipProductStore {
  constructor(
    private readonly filePath = resolveCourseMembershipProductStorePath()
  ) {}

  async getProduct() {
    return cloneProduct(this.readFile().product);
  }

  async saveProduct(product: CourseMembershipProduct) {
    const parsed = CourseMembershipProductSchema.parse(product);
    const file = this.readFile();
    file.product = cloneProduct(parsed);
    this.writeFile(file);
    return cloneProduct(parsed);
  }

  async listAuditEvents(planId?: string) {
    const events = planId
      ? this.readFile().auditEvents.filter(event => event.planId === planId)
      : this.readFile().auditEvents;

    return events
      .map(cloneAuditEvent)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async appendAuditEvent(event: CourseMembershipProductAdminAuditEvent) {
    const parsed = CourseMembershipProductAdminAuditEventSchema.parse(event);
    const file = this.readFile();
    file.auditEvents.unshift(parsed);
    this.writeFile(file);
    return cloneAuditEvent(parsed);
  }

  clear() {
    this.writeFile(emptyCourseMembershipProductStoreFile());
  }

  private readFile(): CourseMembershipProductStoreFile {
    if (!fs.existsSync(this.filePath)) {
      return emptyCourseMembershipProductStoreFile();
    }

    try {
      return normalizeCourseMembershipProductStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyCourseMembershipProductStoreFile();
    }
  }

  private writeFile(file: CourseMembershipProductStoreFile) {
    const normalized = normalizeCourseMembershipProductStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

let defaultStore: CourseMembershipProductStore | undefined;

export function getCourseMembershipProductStore() {
  defaultStore ??= createDefaultCourseMembershipProductStore();
  return defaultStore;
}

export function setCourseMembershipProductStore(
  store: CourseMembershipProductStore
) {
  defaultStore = store;
}

export function createDefaultCourseMembershipProductStore(): CourseMembershipProductStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_MEMBERSHIP_PRODUCT_STORE === "memory"
  ) {
    return new InMemoryCourseMembershipProductStore();
  }

  return new JsonFileCourseMembershipProductStore();
}

export function resolveCourseMembershipProductStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_MEMBERSHIP_PRODUCT_FILE ??
      ".hongboshi-data/course-membership-product.json"
  );
}

export async function updateCourseMembershipProduct({
  request,
  actorId,
  actorRoles = [],
  store = getCourseMembershipProductStore(),
  now = new Date().toISOString(),
}: {
  request: CourseMembershipProductUpdateRequest;
  actorId: string;
  actorRoles?: string[];
  store?: CourseMembershipProductStore;
  now?: string;
}): Promise<CourseMembershipProductAdminMutationResult> {
  const parsedRequest =
    CourseMembershipProductUpdateRequestSchema.parse(request);
  const current = await store.getProduct();
  const next = CourseMembershipProductSchema.parse({
    ...current,
    title: parsedRequest.title,
    subtitle: parsedRequest.subtitle,
    description: parsedRequest.description,
    heroImageUrl: parsedRequest.heroImageUrl,
    scopeLabel: parsedRequest.scopeLabel,
    status: parsedRequest.status,
    updatedAt: now,
  });
  const before = pickProductAuditFields(current);
  const after = pickProductAuditFields(next);

  assertChanged(before, after, "COURSE_MEMBERSHIP_PRODUCT_UNCHANGED");

  const auditEvent = CourseMembershipProductAdminAuditEventSchema.parse({
    id: createAuditEventId("product", current.id, undefined, now),
    productId: current.id,
    productTitle: next.title,
    actorId,
    actorRoles,
    action: "product_update",
    reason: parsedRequest.reason,
    before,
    after,
    createdAt: now,
  });

  const saved = await store.saveProduct(next);
  const savedEvent = await store.appendAuditEvent(auditEvent);

  return CourseMembershipProductAdminMutationResultSchema.parse({
    product: saved,
    auditEvent: savedEvent,
    auditEvents: await store.listAuditEvents(),
  });
}

export async function updateCourseMembershipPlan({
  planId,
  request,
  actorId,
  actorRoles = [],
  store = getCourseMembershipProductStore(),
  now = new Date().toISOString(),
}: {
  planId: string;
  request: CourseMembershipPlanUpdateRequest;
  actorId: string;
  actorRoles?: string[];
  store?: CourseMembershipProductStore;
  now?: string;
}): Promise<CourseMembershipProductAdminMutationResult> {
  const parsedRequest = CourseMembershipPlanUpdateRequestSchema.parse(request);
  const current = await store.getProduct();
  const plan = findMembershipPlan(current, planId);
  const nextPlan = CourseMembershipPlanSchema.parse({
    ...plan,
    title: parsedRequest.title,
    subtitle: parsedRequest.subtitle,
    planName: parsedRequest.planName,
    badge: parsedRequest.badge,
    durationDays: parsedRequest.durationDays,
    originalPrice: parsedRequest.originalPrice,
    payablePrice: parsedRequest.payablePrice,
    benefits: parsedRequest.benefits,
    audience: parsedRequest.audience,
    protections: parsedRequest.protections,
    notices: parsedRequest.notices,
    updatedAt: now,
  });
  const next = productWithPlan(current, nextPlan, now);
  const before = pickPlanAuditFields(plan);
  const after = pickPlanAuditFields(nextPlan);

  assertChanged(before, after, "COURSE_MEMBERSHIP_PLAN_UNCHANGED");

  const auditEvent = CourseMembershipProductAdminAuditEventSchema.parse({
    id: createAuditEventId("plan", current.id, planId, now),
    productId: current.id,
    productTitle: current.title,
    planId,
    planTitle: nextPlan.title,
    actorId,
    actorRoles,
    action: "plan_update",
    reason: parsedRequest.reason,
    before,
    after,
    createdAt: now,
  });

  const saved = await store.saveProduct(next);
  const savedEvent = await store.appendAuditEvent(auditEvent);

  return CourseMembershipProductAdminMutationResultSchema.parse({
    product: saved,
    auditEvent: savedEvent,
    auditEvents: await store.listAuditEvents(),
  });
}

export async function updateCourseMembershipPlanStatus({
  planId,
  request,
  actorId,
  actorRoles = [],
  store = getCourseMembershipProductStore(),
  now = new Date().toISOString(),
}: {
  planId: string;
  request: CourseMembershipPlanStatusUpdateRequest;
  actorId: string;
  actorRoles?: string[];
  store?: CourseMembershipProductStore;
  now?: string;
}): Promise<CourseMembershipProductAdminMutationResult> {
  const parsedRequest =
    CourseMembershipPlanStatusUpdateRequestSchema.parse(request);
  const current = await store.getProduct();
  const plan = findMembershipPlan(current, planId);

  if (plan.status === parsedRequest.status) {
    throw new Error("COURSE_MEMBERSHIP_PLAN_STATUS_UNCHANGED");
  }

  const nextPlan = CourseMembershipPlanSchema.parse({
    ...plan,
    status: parsedRequest.status,
    updatedAt: now,
  });
  const next = productWithPlan(current, nextPlan, now);
  const auditEvent = CourseMembershipProductAdminAuditEventSchema.parse({
    id: createAuditEventId("plan_status", current.id, planId, now),
    productId: current.id,
    productTitle: current.title,
    planId,
    planTitle: plan.title,
    actorId,
    actorRoles,
    action: "plan_status_update",
    reason: parsedRequest.reason,
    before: {
      status: plan.status,
      updatedAt: plan.updatedAt,
    },
    after: {
      status: nextPlan.status,
      updatedAt: nextPlan.updatedAt,
    },
    createdAt: now,
  });

  const saved = await store.saveProduct(next);
  const savedEvent = await store.appendAuditEvent(auditEvent);

  return CourseMembershipProductAdminMutationResultSchema.parse({
    product: saved,
    auditEvent: savedEvent,
    auditEvents: await store.listAuditEvents(),
  });
}

function findMembershipPlan(
  product: CourseMembershipProduct,
  planId: string
): CourseMembershipPlan {
  const plan = product.plans.find(item => item.id === planId);
  if (!plan) throw new Error("COURSE_MEMBERSHIP_PLAN_NOT_FOUND");
  return plan;
}

function productWithPlan(
  product: CourseMembershipProduct,
  plan: CourseMembershipPlan,
  now: string
) {
  return CourseMembershipProductSchema.parse({
    ...product,
    plans: product.plans.map(item => (item.id === plan.id ? plan : item)),
    updatedAt: now,
  });
}

function createAuditEventId(
  action: "product" | "plan" | "plan_status",
  productId: string,
  planId: string | undefined,
  now: string
) {
  const parts = ["audit", "membership", action, productId];
  if (planId) parts.push(planId);
  parts.push(String(Date.parse(now) || Date.now()));
  return parts.join("_");
}

function pickProductAuditFields(product: CourseMembershipProduct) {
  return {
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    heroImageUrl: product.heroImageUrl,
    scopeLabel: product.scopeLabel,
    status: product.status,
    updatedAt: product.updatedAt,
  };
}

function pickPlanAuditFields(plan: CourseMembershipPlan) {
  return {
    title: plan.title,
    subtitle: plan.subtitle,
    planName: plan.planName,
    badge: plan.badge,
    durationDays: plan.durationDays,
    originalPrice: plan.originalPrice,
    payablePrice: plan.payablePrice,
    benefits: plan.benefits,
    audience: plan.audience,
    protections: plan.protections,
    notices: plan.notices,
    status: plan.status,
    updatedAt: plan.updatedAt,
  };
}

function assertChanged(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  errorCode: string
) {
  if (JSON.stringify(before) === JSON.stringify(after)) {
    throw new Error(errorCode);
  }
}

function emptyCourseMembershipProductStoreFile(): CourseMembershipProductStoreFile {
  return {
    version: 1,
    product: defaultCourseMembershipProduct,
    auditEvents: [],
  };
}

function normalizeCourseMembershipProductStoreFile(
  payload: unknown
): CourseMembershipProductStoreFile {
  const parsed = CourseMembershipProductStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyCourseMembershipProductStoreFile();

  return {
    version: 1,
    product: CourseMembershipProductSchema.parse(parsed.data.product),
    auditEvents: parsed.data.auditEvents.map(event =>
      CourseMembershipProductAdminAuditEventSchema.parse(event)
    ),
  };
}

function cloneProduct(product: CourseMembershipProduct) {
  return CourseMembershipProductSchema.parse(
    JSON.parse(JSON.stringify(product))
  );
}

function cloneAuditEvent(event: CourseMembershipProductAdminAuditEvent) {
  return CourseMembershipProductAdminAuditEventSchema.parse(
    JSON.parse(JSON.stringify(event))
  );
}
