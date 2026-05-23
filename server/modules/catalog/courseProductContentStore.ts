import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CourseProductAuditEventSchema,
  CourseProductContentMutationResultSchema,
  CourseProductContentQualityBatchResultSchema,
  CourseProductDetailContentSchema,
  CourseProductListItemSchema,
  evaluateCourseProductContentQuality,
  type CourseProductAuditEvent,
  type CourseProductContentQualityBatchResult,
  type CourseProductContentMutationResult,
  type CourseProductContentUpdateRequest,
  type CourseProductDetailContent,
  type CourseProductListItem,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import {
  getCourseProductStore,
  type CourseProductStore,
} from "./courseProductStore";
import { PostgresCourseProductContentStore } from "./postgresCourseProductContentStore";

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

  if (
    process.env.HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE === "postgres" ||
    (process.env.HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE !== "file" &&
      getDatabaseUrl())
  ) {
    return new PostgresCourseProductContentStore(getSharedPostgresPool());
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
    merchandising: request.merchandising,
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

export async function listCourseProductContentQuality({
  productStore = getCourseProductStore(),
  contentStore = getCourseProductContentStore(),
  now = new Date().toISOString(),
}: {
  productStore?: CourseProductStore;
  contentStore?: CourseProductContentStore;
  now?: string;
} = {}): Promise<CourseProductContentQualityBatchResult> {
  const products = await productStore.listProducts();
  const items = await Promise.all(
    products.map(async product => {
      const content =
        (await contentStore.getContent(product.id)) ??
        buildDefaultCourseProductContent(product, now);
      return {
        productId: product.id,
        productTitle: product.title,
        status: product.status,
        reviewStatus: product.reviewStatus,
        quality: evaluateCourseProductContentQuality(content),
      };
    })
  );
  const readyCount = items.filter(item => item.quality.ready).length;
  const blockedCount = items.length - readyCount;
  const warningCount = items.filter(
    item => item.quality.warningCount > 0
  ).length;

  return CourseProductContentQualityBatchResultSchema.parse({
    items,
    summary: {
      totalCount: items.length,
      readyCount,
      blockedCount,
      warningCount,
    },
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
    merchandising: {
      headline: `${product.category}课程：先看清问题，再开始练习`,
      subheadline: `围绕「${product.title}」配置成交主视觉、课程卖点和图文资产，帮助用户在购买前快速判断是否适合自己。`,
      showcaseImageUrl: product.coverUrl,
      showcaseImageAlt: product.title,
      sellingPoints: [
        `围绕${product.category}的常见场景展开`,
        "章节结构清晰，适合碎片时间学习",
        "搭配练习素材，方便回到日常复盘",
      ],
      imageAssets: [
        {
          id: `${product.id}_merch_showcase`,
          title: "课程成交主视觉",
          imageUrl: product.coverUrl,
          altText: product.title,
          usage: "showcase",
          complianceStatus: "not_required",
        },
      ],
      richTextBlocks: [
        {
          id: `${product.id}_h5_heading_1`,
          type: "section_heading",
          title: "适合先从一个可练习的改变开始",
        },
        {
          id: `${product.id}_h5_paragraph_1`,
          type: "paragraph",
          body: `${product.title}会把${product.category}中的典型困扰拆成可理解的场景、可执行的练习和可复盘的行动。`,
        },
        {
          id: `${product.id}_h5_purchase_note_1`,
          type: "purchase_note",
          body: "购买后可进入课程学习页查看章节、练习和已开放资料；如遇服务问题，可在个人中心订单详情发起售后。",
        },
      ],
    },
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
    merchandisingHeadline: content.merchandising.headline ?? null,
    merchandisingAssetCount:
      content.merchandising.imageAssets.length +
      (content.merchandising.showcaseImageUrl ? 1 : 0),
    merchandisingSellingPointCount: content.merchandising.sellingPoints.length,
    richTextBlockCount: content.merchandising.richTextBlocks.length,
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
