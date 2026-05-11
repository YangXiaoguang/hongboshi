import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CourseProductAuditEventSchema,
  CourseProductContentMutationResultSchema,
  CourseProductDetailContentSchema,
  CourseProductListItemSchema,
  type CourseProductAuditEvent,
  type CourseProductContentMutationResult,
  type CourseProductContentUpdateRequest,
  type CourseProductDetailContent,
  type CourseProductListItem,
} from "../../../shared/domain";
import {
  getCourseProductStore,
  type CourseProductStore,
} from "./courseProductStore";

const CourseProductContentStoreFileSchema = z.object({
  version: z.literal(1),
  contents: z.array(CourseProductDetailContentSchema),
});

type CourseProductContentStoreFile = z.infer<
  typeof CourseProductContentStoreFileSchema
>;

export interface CourseProductContentStore {
  getContent(
    productId: string
  ): Promise<CourseProductDetailContent | undefined>;
  saveContent(
    content: CourseProductDetailContent
  ): Promise<CourseProductDetailContent>;
}

export class InMemoryCourseProductContentStore implements CourseProductContentStore {
  private contents = new Map<string, CourseProductDetailContent>();

  constructor(contents: CourseProductDetailContent[] = []) {
    contents.forEach(content => {
      const parsed = CourseProductDetailContentSchema.parse(content);
      this.contents.set(parsed.productId, cloneContent(parsed));
    });
  }

  async getContent(productId: string) {
    const content = this.contents.get(productId);
    return content ? cloneContent(content) : undefined;
  }

  async saveContent(content: CourseProductDetailContent) {
    const parsed = CourseProductDetailContentSchema.parse(content);
    this.contents.set(parsed.productId, cloneContent(parsed));
    return cloneContent(parsed);
  }
}

export class JsonFileCourseProductContentStore implements CourseProductContentStore {
  constructor(
    private readonly filePath = resolveCourseProductContentStorePath()
  ) {}

  async getContent(productId: string) {
    const content = this.readFile().contents.find(
      item => item.productId === productId
    );
    return content ? cloneContent(content) : undefined;
  }

  async saveContent(content: CourseProductDetailContent) {
    const parsed = CourseProductDetailContentSchema.parse(content);
    const file = this.readFile();
    const existingIndex = file.contents.findIndex(
      item => item.productId === parsed.productId
    );

    if (existingIndex >= 0) {
      file.contents[existingIndex] = parsed;
    } else {
      file.contents.push(parsed);
    }

    this.writeFile(file);
    return cloneContent(parsed);
  }

  clear() {
    this.writeFile(emptyCourseProductContentStoreFile());
  }

  private readFile(): CourseProductContentStoreFile {
    if (!fs.existsSync(this.filePath)) {
      return emptyCourseProductContentStoreFile();
    }

    try {
      return normalizeCourseProductContentStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyCourseProductContentStoreFile();
    }
  }

  private writeFile(file: CourseProductContentStoreFile) {
    const normalized = normalizeCourseProductContentStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

let defaultContentStore: CourseProductContentStore | undefined;

export function getCourseProductContentStore() {
  defaultContentStore ??= createDefaultCourseProductContentStore();
  return defaultContentStore;
}

export function setCourseProductContentStore(store: CourseProductContentStore) {
  defaultContentStore = store;
}

export function createDefaultCourseProductContentStore(): CourseProductContentStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE === "memory"
  ) {
    return new InMemoryCourseProductContentStore();
  }

  return new JsonFileCourseProductContentStore();
}

export function resolveCourseProductContentStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_PRODUCT_CONTENT_FILE ??
      ".hongboshi-data/course-product-content.json"
  );
}

export async function getCourseProductContentForProduct({
  productId,
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  now = new Date().toISOString(),
}: {
  productId: string;
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  now?: string;
}) {
  const product = await productStore.getProduct(productId);
  if (!product) throw new Error("COURSE_PRODUCT_NOT_FOUND");

  return (
    (await contentStore.getContent(productId)) ??
    buildDefaultCourseProductContent(product, now)
  );
}

export async function updateCourseProductContent({
  productId,
  request,
  actorId,
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  now = new Date().toISOString(),
}: {
  productId: string;
  request: CourseProductContentUpdateRequest;
  actorId: string;
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  now?: string;
}): Promise<CourseProductContentMutationResult> {
  const currentProduct = await productStore.getProduct(productId);
  if (!currentProduct) throw new Error("COURSE_PRODUCT_NOT_FOUND");

  const currentContent =
    (await contentStore.getContent(productId)) ??
    buildDefaultCourseProductContent(currentProduct, currentProduct.updatedAt);
  const nextContent = CourseProductDetailContentSchema.parse({
    productId,
    summary: request.summary,
    targetAudience: request.targetAudience,
    chapters: request.chapters,
    updatedAt: now,
  });

  const beforeContent = pickContentAuditFields(currentContent);
  const afterContent = pickContentAuditFields(nextContent);
  if (JSON.stringify(beforeContent) === JSON.stringify(afterContent)) {
    throw new Error("COURSE_PRODUCT_CONTENT_UNCHANGED");
  }

  const nextProduct = CourseProductListItemSchema.parse({
    ...currentProduct,
    status:
      currentProduct.status === "published"
        ? "unpublished"
        : currentProduct.status,
    reviewStatus:
      currentProduct.reviewStatus === "not_submitted"
        ? currentProduct.reviewStatus
        : "not_submitted",
    updatedAt: now,
  });
  const auditEvent = CourseProductAuditEventSchema.parse({
    id: createContentAuditEventId(productId, now),
    productId,
    productTitle: currentProduct.title,
    actorId,
    action: "content_update",
    reason: request.reason,
    before: {
      ...beforeContent,
      status: currentProduct.status,
      reviewStatus: currentProduct.reviewStatus,
    },
    after: {
      ...afterContent,
      status: nextProduct.status,
      reviewStatus: nextProduct.reviewStatus,
    },
    createdAt: now,
  });

  const savedProduct = await productStore.saveProduct(nextProduct);
  const savedContent = await contentStore.saveContent(nextContent);
  const savedEvent = await productStore.appendAuditEvent(auditEvent);

  return CourseProductContentMutationResultSchema.parse({
    product: savedProduct,
    content: savedContent,
    auditEvent: savedEvent,
    auditEvents: await productStore.listAuditEvents(productId),
  });
}

export function buildDefaultCourseProductContent(
  product: CourseProductListItem,
  updatedAt = product.updatedAt
): CourseProductDetailContent {
  return CourseProductDetailContentSchema.parse({
    productId: product.id,
    summary: `${product.title}围绕${product.category}主题，帮助学习者把困扰拆成可理解、可练习、可持续复盘的行动路径。`,
    targetAudience: [
      `希望系统学习${product.category}的用户`,
      "需要低压力练习和清晰步骤的学习者",
      "希望把课程、测评和咨询结合起来的人",
    ],
    chapters: [
      {
        id: `${product.id}_chapter_1`,
        title: "看见当下困扰",
        durationMinutes: 38,
        materialPlaceholders: [
          {
            id: `${product.id}_material_1`,
            title: "课前自评表",
            type: "exercise",
            status: "pending",
          },
        ],
      },
      {
        id: `${product.id}_chapter_2`,
        title: "建立理解框架",
        durationMinutes: 52,
        materialPlaceholders: [
          {
            id: `${product.id}_material_2`,
            title: "章节讲义",
            type: "document",
            status: "pending",
          },
        ],
      },
      {
        id: `${product.id}_chapter_3`,
        title: "进入日常练习",
        durationMinutes: 46,
        materialPlaceholders: [
          {
            id: `${product.id}_material_3`,
            title: "课后行动清单",
            type: "exercise",
            status: "pending",
          },
        ],
      },
    ],
    updatedAt,
  });
}

function pickContentAuditFields(content: CourseProductDetailContent) {
  return {
    summary: content.summary,
    targetAudienceCount: content.targetAudience.length,
    chapterCount: content.chapters.length,
    materialCount: content.chapters.reduce(
      (total, chapter) => total + chapter.materialPlaceholders.length,
      0
    ),
  };
}

function createContentAuditEventId(productId: string, now: string) {
  return `audit_content_${productId}_${Date.parse(now) || Date.now()}`;
}

function emptyCourseProductContentStoreFile(): CourseProductContentStoreFile {
  return {
    version: 1,
    contents: [],
  };
}

function normalizeCourseProductContentStoreFile(
  payload: unknown
): CourseProductContentStoreFile {
  const parsed = CourseProductContentStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyCourseProductContentStoreFile();

  return {
    version: 1,
    contents: parsed.data.contents.map(content =>
      CourseProductDetailContentSchema.parse(content)
    ),
  };
}

function cloneContent(content: CourseProductDetailContent) {
  return CourseProductDetailContentSchema.parse(
    JSON.parse(JSON.stringify(content))
  );
}
