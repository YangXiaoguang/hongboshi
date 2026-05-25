import type {
  CourseProductMerchandisingAssetUsage,
  CourseProductRichTextBlockType,
} from "@shared/domain";

export type DetailBlockStyleState = {
  tone: "plain" | "warm" | "fresh" | "deep";
  spacing: "compact" | "normal" | "relaxed";
  radius: "none" | "small" | "medium" | "large";
  imageAspectRatio: "auto" | "1:1" | "4:3" | "16:9" | "3:4" | "long";
  imageFit: "cover" | "contain";
  captionMode: "hidden" | "below" | "overlay";
};

export type DetailDesignerSelection =
  | { kind: "overview" }
  | { kind: "asset"; id: string }
  | { kind: "block"; id: string };

export type MediaAssetFormState = {
  id: string;
  title: string;
  imageUrl: string;
  altText: string;
  usage: CourseProductMerchandisingAssetUsage;
  complianceStatus: "not_required" | "pending" | "approved" | "rejected";
  note: string;
  style: DetailBlockStyleState;
};

export type H5BlockFormState = {
  id: string;
  type: CourseProductRichTextBlockType;
  title: string;
  body: string;
  imageUrl: string;
  altText: string;
  itemsText: string;
  question: string;
  answer: string;
  style: DetailBlockStyleState;
};

export type ContentWorkbenchFormState = {
  summary: string;
  targetAudienceText: string;
  headline: string;
  subheadline: string;
  showcaseImageUrl: string;
  showcaseImageAlt: string;
  sellingPointsText: string;
  imageAssets: MediaAssetFormState[];
  richTextBlocks: H5BlockFormState[];
};

export type DetailContentTemplateId =
  | "warm_course"
  | "decision_first"
  | "image_story";

export type DetailContentTemplateContext = {
  title: string;
  instructorName: string;
  category: string;
  type: string;
};

export type DetailDesignerSavedTemplate = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  targetAudienceText: string;
  headline: string;
  subheadline: string;
  sellingPointsText: string;
  richTextBlocks: H5BlockFormState[];
};

export type DetailDesignerStorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export const detailBlockStyleDefaults: DetailBlockStyleState = {
  tone: "plain",
  spacing: "normal",
  radius: "medium",
  imageAspectRatio: "4:3",
  imageFit: "cover",
  captionMode: "below",
};

export const detailDesignerSavedTemplateStorageKey =
  "hongboshi.admin.courseProductDetailTemplates.v1";

export const styleToneOptions: {
  value: DetailBlockStyleState["tone"];
  label: string;
}[] = [
  { value: "plain", label: "清爽" },
  { value: "warm", label: "温暖" },
  { value: "fresh", label: "清新" },
  { value: "deep", label: "深色" },
];

export const styleSpacingOptions: {
  value: DetailBlockStyleState["spacing"];
  label: string;
}[] = [
  { value: "compact", label: "紧凑" },
  { value: "normal", label: "标准" },
  { value: "relaxed", label: "舒展" },
];

export const styleRadiusOptions: {
  value: DetailBlockStyleState["radius"];
  label: string;
}[] = [
  { value: "none", label: "直角" },
  { value: "small", label: "小圆角" },
  { value: "medium", label: "中圆角" },
  { value: "large", label: "大圆角" },
];

export const imageAspectRatioOptions: {
  value: DetailBlockStyleState["imageAspectRatio"];
  label: string;
}[] = [
  { value: "auto", label: "原图" },
  { value: "1:1", label: "方图" },
  { value: "4:3", label: "商品图" },
  { value: "16:9", label: "横幅" },
  { value: "3:4", label: "竖图" },
  { value: "long", label: "长图" },
];

export const imageFitOptions: {
  value: DetailBlockStyleState["imageFit"];
  label: string;
}[] = [
  { value: "cover", label: "铺满" },
  { value: "contain", label: "完整显示" },
];

export const imageCaptionModeOptions: {
  value: DetailBlockStyleState["captionMode"];
  label: string;
}[] = [
  { value: "below", label: "图下说明" },
  { value: "overlay", label: "图上浮层" },
  { value: "hidden", label: "隐藏说明" },
];

export const merchandisingAssetUsageOptions: {
  value: CourseProductMerchandisingAssetUsage;
  label: string;
}[] = [
  { value: "showcase", label: "主视觉" },
  { value: "proof", label: "证明图" },
  { value: "gallery", label: "详情图" },
];

export const h5BlockTypeOptions: {
  value: CourseProductRichTextBlockType;
  label: string;
}[] = [
  { value: "section_heading", label: "标题" },
  { value: "paragraph", label: "正文" },
  { value: "image", label: "图片" },
  { value: "bullet_list", label: "要点" },
  { value: "faq", label: "FAQ" },
  { value: "instructor_intro", label: "讲师介绍" },
  { value: "purchase_note", label: "购买须知" },
];

export const detailContentTemplateDefinitions: {
  id: DetailContentTemplateId;
  label: string;
  description: string;
  badge: string;
}[] = [
  {
    id: "warm_course",
    label: "温暖课程型",
    description: "适合心理成长课程，先解释适配人群，再承接练习和售后。",
    badge: "推荐",
  },
  {
    id: "decision_first",
    label: "下单决策型",
    description: "把问题、方法、交付和常见疑问前置，降低购买犹豫。",
    badge: "转化",
  },
  {
    id: "image_story",
    label: "图文故事型",
    description: "突出详情图、场景图和分段说明，适合素材较充分的商品。",
    badge: "图文",
  },
];

export function createDetailDraftId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 10000)}`;
}

export function detailBlockStyleFromValue(
  style?: Partial<DetailBlockStyleState>
): DetailBlockStyleState {
  return {
    ...detailBlockStyleDefaults,
    ...style,
  };
}

export function detailStyleToneClass(style: DetailBlockStyleState) {
  return {
    plain: "border-[#EFE7DA] bg-white",
    warm: "border-[#E7D2BA] bg-[#FFF8EE]",
    fresh: "border-[#C9D8C2] bg-[#F2F8F1]",
    deep: "border-[#243B35] bg-[#243B35] text-white",
  }[style.tone];
}

export function detailStylePaddingClass(style: DetailBlockStyleState) {
  return {
    compact: "p-3",
    normal: "p-4",
    relaxed: "p-5",
  }[style.spacing];
}

export function detailStyleRadiusClass(style: DetailBlockStyleState) {
  return {
    none: "rounded-none",
    small: "rounded-md",
    medium: "rounded-xl",
    large: "rounded-2xl",
  }[style.radius];
}

export function detailImageAspectClass(style: DetailBlockStyleState) {
  return {
    auto: "h-auto",
    "1:1": "aspect-square",
    "4:3": "aspect-[4/3]",
    "16:9": "aspect-video",
    "3:4": "aspect-[3/4]",
    long: "aspect-[3/5]",
  }[style.imageAspectRatio];
}

export function detailImageFitClass(style: DetailBlockStyleState) {
  return style.imageFit === "contain" ? "object-contain" : "object-cover";
}

export function splitLines(value: string) {
  return value
    .split(/\n+/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function createH5BlockForm(
  type: CourseProductRichTextBlockType
): H5BlockFormState {
  const presets = {
    section_heading: {
      title: "课程能帮你解决什么",
      body: "",
    },
    paragraph: {
      title: "",
      body: "用清晰的讲解和练习，把当下困扰拆成可理解、可执行、可复盘的步骤。",
    },
    image: {
      title: "课程场景图",
      body: "",
    },
    bullet_list: {
      title: "你将获得",
      body: "",
    },
    faq: {
      title: "",
      body: "",
    },
    instructor_intro: {
      title: "讲师介绍",
      body: "讲师会结合心理服务场景，带你完成安全、低压力的学习和练习。",
    },
    purchase_note: {
      title: "购买须知",
      body: "购买后可进入学习页查看课程章节和已开放资料，订单和售后进度可在个人中心查看。",
    },
  } satisfies Record<
    CourseProductRichTextBlockType,
    { title: string; body: string }
  >;

  return {
    id: createDetailDraftId("h5_block"),
    type,
    title: presets[type].title,
    body: presets[type].body,
    imageUrl: "",
    altText: "",
    itemsText:
      type === "bullet_list" ? "清晰课程路径\n可落地练习\n可复盘资料" : "",
    question: type === "faq" ? "购买后可以反复学习吗？" : "",
    answer:
      type === "faq" ? "课程权益有效期内可以反复进入学习页查看内容。" : "",
    style: detailBlockStyleFromValue(
      type === "image"
        ? { imageAspectRatio: "16:9", radius: "large", tone: "warm" }
        : undefined
    ),
  };
}

export function cloneH5BlockForm(block: H5BlockFormState): H5BlockFormState {
  return {
    ...block,
    id: createDetailDraftId("h5_block_copy"),
    title: block.title ? `${block.title} 副本` : block.title,
    question: block.question ? `${block.question} 副本` : block.question,
  };
}

export function moveH5BlockForm(
  blocks: H5BlockFormState[],
  blockId: string,
  direction: "up" | "down"
): H5BlockFormState[] {
  const currentIndex = blocks.findIndex(block => block.id === blockId);
  if (currentIndex < 0) return blocks;
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= blocks.length) return blocks;

  const nextBlocks = [...blocks];
  const [currentBlock] = nextBlocks.splice(currentIndex, 1);
  if (!currentBlock) return blocks;
  nextBlocks.splice(targetIndex, 0, currentBlock);
  return nextBlocks;
}

export function insertH5BlockAfter(
  blocks: H5BlockFormState[],
  afterBlockId: string,
  block: H5BlockFormState
): H5BlockFormState[] {
  const currentIndex = blocks.findIndex(item => item.id === afterBlockId);
  if (currentIndex < 0) return [...blocks, block];
  return [
    ...blocks.slice(0, currentIndex + 1),
    block,
    ...blocks.slice(currentIndex + 1),
  ];
}

export function removeH5BlockForm(
  blocks: H5BlockFormState[],
  blockId: string
): H5BlockFormState[] {
  return blocks.filter(block => block.id !== blockId);
}

export function createDetailDesignerSavedTemplate(
  form: ContentWorkbenchFormState,
  name: string,
  options: { id?: string; createdAt?: string; now?: string } = {}
): DetailDesignerSavedTemplate {
  const now = options.now ?? new Date().toISOString();
  const createdAt = options.createdAt ?? now;

  return {
    id: options.id ?? createDetailDraftId("detail_template"),
    name: name.trim() || "未命名详情模板",
    createdAt,
    updatedAt: now,
    summary: form.summary,
    targetAudienceText: form.targetAudienceText,
    headline: form.headline,
    subheadline: form.subheadline,
    sellingPointsText: form.sellingPointsText,
    richTextBlocks: form.richTextBlocks.map(block => ({
      ...block,
      id: createDetailDraftId("template_block"),
    })),
  };
}

export function applyDetailDesignerSavedTemplate(
  form: ContentWorkbenchFormState,
  template: DetailDesignerSavedTemplate
): ContentWorkbenchFormState {
  return {
    ...form,
    summary: template.summary,
    targetAudienceText: template.targetAudienceText,
    headline: template.headline,
    subheadline: template.subheadline,
    sellingPointsText: template.sellingPointsText,
    richTextBlocks: template.richTextBlocks.map(block => ({
      ...block,
      id: createDetailDraftId("saved_template_block"),
    })),
  };
}

function isH5BlockType(
  value: unknown
): value is CourseProductRichTextBlockType {
  return h5BlockTypeOptions.some(option => option.value === value);
}

function stringFromUnknown(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeSavedBlock(value: unknown): H5BlockFormState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Partial<H5BlockFormState>;
  if (!isH5BlockType(item.type)) return undefined;

  return {
    id: stringFromUnknown(item.id) || createDetailDraftId("saved_block"),
    type: item.type,
    title: stringFromUnknown(item.title),
    body: stringFromUnknown(item.body),
    imageUrl: stringFromUnknown(item.imageUrl),
    altText: stringFromUnknown(item.altText),
    itemsText: stringFromUnknown(item.itemsText),
    question: stringFromUnknown(item.question),
    answer: stringFromUnknown(item.answer),
    style: detailBlockStyleFromValue(item.style),
  };
}

function normalizeSavedTemplate(
  value: unknown
): DetailDesignerSavedTemplate | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Partial<DetailDesignerSavedTemplate>;
  const blocks = Array.isArray(item.richTextBlocks)
    ? item.richTextBlocks
        .map(block => normalizeSavedBlock(block))
        .filter((block): block is H5BlockFormState => Boolean(block))
    : [];
  if (!item.id || !item.name || blocks.length === 0) return undefined;

  return {
    id: stringFromUnknown(item.id),
    name: stringFromUnknown(item.name),
    createdAt: stringFromUnknown(item.createdAt),
    updatedAt: stringFromUnknown(item.updatedAt),
    summary: stringFromUnknown(item.summary),
    targetAudienceText: stringFromUnknown(item.targetAudienceText),
    headline: stringFromUnknown(item.headline),
    subheadline: stringFromUnknown(item.subheadline),
    sellingPointsText: stringFromUnknown(item.sellingPointsText),
    richTextBlocks: blocks,
  };
}

export function parseDetailDesignerSavedTemplates(
  value: string | null | undefined
): DetailDesignerSavedTemplate[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => normalizeSavedTemplate(item))
      .filter((template): template is DetailDesignerSavedTemplate =>
        Boolean(template)
      )
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function loadDetailDesignerSavedTemplates(
  storage?: Pick<DetailDesignerStorageLike, "getItem">
): DetailDesignerSavedTemplate[] {
  if (!storage) return [];
  return parseDetailDesignerSavedTemplates(
    storage.getItem(detailDesignerSavedTemplateStorageKey)
  );
}

export function saveDetailDesignerSavedTemplates(
  storage:
    | Pick<DetailDesignerStorageLike, "setItem" | "removeItem">
    | undefined,
  templates: DetailDesignerSavedTemplate[]
) {
  if (!storage) return;
  if (templates.length === 0) {
    storage.removeItem(detailDesignerSavedTemplateStorageKey);
    return;
  }
  storage.setItem(
    detailDesignerSavedTemplateStorageKey,
    JSON.stringify(templates.slice(0, 12))
  );
}

export function createDefaultContentWorkbenchForm(
  defaultCoverUrl: string
): ContentWorkbenchFormState {
  return {
    summary: "",
    targetAudienceText: "",
    headline: "",
    subheadline: "",
    showcaseImageUrl: defaultCoverUrl,
    showcaseImageAlt: "",
    sellingPointsText: "",
    imageAssets: [],
    richTextBlocks: [
      createH5BlockForm("section_heading"),
      createH5BlockForm("paragraph"),
      createH5BlockForm("purchase_note"),
    ],
  };
}

export function autoGeneratedH5BlockForms(
  form: ContentWorkbenchFormState
): H5BlockFormState[] {
  const sellingPoints = splitLines(form.sellingPointsText);
  const audience = splitLines(form.targetAudienceText);
  const bulletItems = sellingPoints.length
    ? sellingPoints
    : audience.length
      ? audience.map(item => `适合${item}`)
      : ["明确学习目标", "跟随课程练习", "在个人中心复盘进度"];

  return [
    {
      ...createH5BlockForm("section_heading"),
      id: "auto_h5_heading",
      title: optionalText(form.headline) ?? "课程能帮你解决什么",
    },
    {
      ...createH5BlockForm("paragraph"),
      id: "auto_h5_summary",
      body:
        optionalText(form.summary) ??
        "这门课程会把关键心理议题拆成容易理解的知识、练习和复盘步骤，适合希望稳步改善当下状态的学习者。",
    },
    {
      ...createH5BlockForm("bullet_list"),
      id: "auto_h5_points",
      title: "你将获得",
      itemsText: bulletItems.slice(0, 6).join("\n"),
    },
    {
      ...createH5BlockForm("purchase_note"),
      id: "auto_h5_purchase_note",
      body: "购买后可在学习页查看课程章节和已开放资料，订单、学习进度和售后状态可在个人中心查看。",
    },
  ];
}

export function h5BlockFormsForSave(
  form: ContentWorkbenchFormState,
  useSimpleContentMode: boolean
) {
  return useSimpleContentMode
    ? autoGeneratedH5BlockForms(form)
    : form.richTextBlocks;
}

function styleForTemplateImage(
  templateId: DetailContentTemplateId,
  index: number
): DetailBlockStyleState {
  if (templateId === "image_story") {
    return detailBlockStyleFromValue({
      tone: index === 0 ? "deep" : "warm",
      spacing: "compact",
      radius: "large",
      imageAspectRatio: index === 0 ? "16:9" : "long",
      captionMode: index === 0 ? "overlay" : "below",
    });
  }

  if (templateId === "decision_first") {
    return detailBlockStyleFromValue({
      tone: "fresh",
      spacing: "normal",
      radius: "medium",
      imageAspectRatio: "4:3",
      captionMode: "below",
    });
  }

  return detailBlockStyleFromValue({
    tone: "warm",
    spacing: "normal",
    radius: "large",
    imageAspectRatio: "16:9",
    captionMode: "below",
  });
}

function styleForTemplateBlock(
  templateId: DetailContentTemplateId,
  type: CourseProductRichTextBlockType,
  index: number
): DetailBlockStyleState {
  if (type === "image") return styleForTemplateImage(templateId, index);
  if (templateId === "decision_first") {
    return detailBlockStyleFromValue({
      tone: type === "section_heading" ? "deep" : "plain",
      spacing: type === "section_heading" ? "relaxed" : "normal",
      radius: "large",
    });
  }
  if (templateId === "image_story") {
    return detailBlockStyleFromValue({
      tone: index % 2 === 0 ? "plain" : "warm",
      spacing: "relaxed",
      radius: "large",
    });
  }
  return detailBlockStyleFromValue({
    tone:
      type === "section_heading"
        ? "fresh"
        : type === "purchase_note"
          ? "warm"
          : "plain",
    spacing: "normal",
    radius: "medium",
  });
}

function createTemplateBlock(
  templateId: DetailContentTemplateId,
  type: CourseProductRichTextBlockType,
  index: number,
  patch: Partial<H5BlockFormState>
) {
  return {
    ...createH5BlockForm(type),
    ...patch,
    id: createDetailDraftId(`template_${templateId}_${type}`),
    type,
    style: styleForTemplateBlock(templateId, type, index),
  };
}

function buildTemplateBlocks(
  form: ContentWorkbenchFormState,
  context: DetailContentTemplateContext,
  templateId: DetailContentTemplateId
): H5BlockFormState[] {
  const title = context.title || "这门课程";
  const category = context.category || "心理成长";
  const type = context.type || "课程";
  const summary =
    optionalText(form.summary) ??
    `${title}会把${category}议题拆成容易理解的知识、练习和复盘步骤。`;
  const sellingPoints = splitLines(form.sellingPointsText);
  const fallbackPoints = sellingPoints.length
    ? sellingPoints
    : ["先看清问题，再进入练习", "章节节奏清晰", "买后权益和学习记录可追踪"];
  const primaryImage = form.imageAssets[0];
  const secondaryImage = form.imageAssets[1];

  if (templateId === "decision_first") {
    return [
      createTemplateBlock(templateId, "section_heading", 0, {
        title: "买前先看清：问题、方法和交付",
      }),
      createTemplateBlock(templateId, "paragraph", 1, {
        body: `${title}先说明适合谁、解决什么问题，再把学习路径、资料交付和售后边界放到购买前。`,
      }),
      createTemplateBlock(templateId, "bullet_list", 2, {
        title: "为什么适合现在购买",
        itemsText: fallbackPoints.slice(0, 5).join("\n"),
      }),
      createTemplateBlock(templateId, "faq", 3, {
        question: "购买后从哪里开始学习？",
        answer:
          "支付成功后课程权益会进入账户，可从课程详情、学习页或个人中心继续学习，并查看订单与售后状态。",
      }),
      createTemplateBlock(templateId, "purchase_note", 4, {
        body: "心理成长课程用于学习与自我练习，不替代诊断、治疗或危机干预；如有明显风险，请优先联系专业支持。",
      }),
    ];
  }

  if (templateId === "image_story") {
    return [
      createTemplateBlock(templateId, "section_heading", 0, {
        title: "用图文快速了解这门课",
      }),
      createTemplateBlock(templateId, "image", 1, {
        title: primaryImage?.title ?? "课程核心场景",
        imageUrl: primaryImage?.imageUrl ?? "",
        altText: primaryImage?.altText ?? primaryImage?.title ?? "",
      }),
      createTemplateBlock(templateId, "paragraph", 2, {
        body: summary,
      }),
      createTemplateBlock(templateId, "image", 3, {
        title: secondaryImage?.title ?? "学习后可获得什么",
        imageUrl: secondaryImage?.imageUrl ?? "",
        altText: secondaryImage?.altText ?? secondaryImage?.title ?? "",
      }),
      createTemplateBlock(templateId, "bullet_list", 4, {
        title: "学习完成后你会带走",
        itemsText: fallbackPoints.slice(0, 5).join("\n"),
      }),
      createTemplateBlock(templateId, "purchase_note", 5, {
        body: "购买后可在学习页查看章节、练习和已开放资料，订单与权益会在个人中心持续可查。",
      }),
    ];
  }

  return [
    createTemplateBlock(templateId, "section_heading", 0, {
      title: "适合先从一个可练习的改变开始",
    }),
    createTemplateBlock(templateId, "paragraph", 1, {
      body: `${title}围绕${category}主题，把典型困扰拆成可理解的场景、可执行的练习和可复盘的行动。`,
    }),
    createTemplateBlock(templateId, "bullet_list", 2, {
      title: "你将获得",
      itemsText: fallbackPoints.slice(0, 5).join("\n"),
    }),
    createTemplateBlock(templateId, "instructor_intro", 3, {
      body: `${context.instructorName || "讲师"}会以清晰的${type}节奏带你完成学习、练习和复盘，帮助你把内容带回日常生活。`,
    }),
    createTemplateBlock(templateId, "purchase_note", 4, {
      body: "购买后可进入课程学习页查看章节、练习和已开放资料；如遇服务问题，可在个人中心订单详情发起售后。",
    }),
  ];
}

export function applyDetailContentTemplate(
  form: ContentWorkbenchFormState,
  context: DetailContentTemplateContext,
  templateId: DetailContentTemplateId
): ContentWorkbenchFormState {
  const title = context.title || "这门课程";
  const category = context.category || "心理成长";
  const type = context.type || "课程";
  const instructor = context.instructorName || "讲师";
  const hasAudience = splitLines(form.targetAudienceText).length > 0;
  const hasSellingPoints = splitLines(form.sellingPointsText).length >= 2;

  return {
    ...form,
    summary:
      optionalText(form.summary) ??
      `${title}围绕${category}主题设计，把心理成长内容拆成可理解、可练习、可复盘的学习步骤，适合希望用${type}方式稳定推进自我调整的用户。`,
    targetAudienceText: hasAudience
      ? form.targetAudienceText
      : [
          `正在关注${category}议题，希望先用课程建立清晰认识的人`,
          "想按章节练习、逐步把方法落到生活场景的人",
          "希望学习记录、资料和订单都能在个人中心统一管理的人",
        ].join("\n"),
    sellingPointsText: hasSellingPoints
      ? form.sellingPointsText
      : [
          "从真实生活场景切入，先理解问题，再进入练习",
          "章节节奏清晰，适合碎片时间逐步完成",
          "购买后同步课程权益、资料与学习档案，减少找入口成本",
          "可衔接测评和咨询支持，学习后仍有承接路径",
        ].join("\n"),
    headline:
      optionalText(form.headline) ??
      `${title}：把${category}变成可练习的成长路径`,
    subheadline:
      optionalText(form.subheadline) ??
      `${instructor}带你用清晰的${type}节奏完成学习、练习和复盘。`,
    showcaseImageAlt: optionalText(form.showcaseImageAlt) ?? title,
    imageAssets: form.imageAssets.map((asset, index) => ({
      ...asset,
      style: styleForTemplateImage(templateId, index),
    })),
    richTextBlocks: buildTemplateBlocks(form, context, templateId),
  };
}
