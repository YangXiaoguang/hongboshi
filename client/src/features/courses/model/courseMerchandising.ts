import type {
  Course,
  CourseCategory,
  CourseDetail,
  CourseProductMerchandisingAsset,
  CourseProductMerchandisingContent,
  CourseProductRichTextBlock,
  CourseProductSummaryRichText,
  CourseProductSummaryRichTextBlock,
} from "@shared/domain";
import type { CourseLearningPath } from "./coursePath";

export interface CourseMerchandisingProof {
  label: string;
  value: string;
  description: string;
}

export interface CourseMerchandisingVisualAsset {
  id: string;
  title: string;
  imageUrl: string;
  altText: string;
  usage: "proof" | "gallery";
  style?: CourseProductMerchandisingAsset["style"];
  note?: string;
}

export interface CourseMerchandisingProfile {
  promise: string;
  buyerQuestion: string;
  showcaseImageUrl: string;
  showcaseImageAlt: string;
  proofPoints: CourseMerchandisingProof[];
  sellingPoints: string[];
  visualAssets: CourseMerchandisingVisualAsset[];
  summaryRichText: CourseProductSummaryRichTextBlock[];
  richTextBlocks: CourseProductRichTextBlock[];
}

const showcaseImages: Record<CourseCategory, string> = {
  个人成长:
    "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1280&q=84",
  情绪管理:
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1280&q=84",
  职场心理:
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1280&q=84",
  家庭教育:
    "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1280&q=84",
  心理科普:
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1280&q=84",
  婚姻关系:
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1280&q=84",
  青少年心理:
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1280&q=84",
  心理咨询师:
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1280&q=84",
  正念冥想:
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1280&q=84",
  认知行为:
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1280&q=84",
  催眠治疗:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1280&q=84",
  沙盘疗法:
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1280&q=84",
  绘画疗法:
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1280&q=84",
  团体辅导:
    "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1280&q=84",
};

const categoryPromises: Record<CourseCategory, string> = {
  个人成长: "把自我理解变成可以坚持的每日练习",
  情绪管理: "先稳住当下情绪，再恢复行动感",
  职场心理: "从压力、边界和沟通里找回能量",
  家庭教育: "把亲子冲突重新拉回可对话的现场",
  心理科普: "用科学视角看懂常见心理困扰",
  婚姻关系: "看见关系循环，练习更安全的表达",
  青少年心理: "理解青春期变化背后的心理需求",
  心理咨询师: "建立专业、审慎的助人框架",
  正念冥想: "让身体和注意力重新学会放松",
  认知行为: "识别想法、情绪和行为之间的循环",
  催眠治疗: "理解放松、想象与潜意识工作的边界",
  沙盘疗法: "通过象征表达看见内在经验",
  绘画疗法: "用图像表达语言难以说出的部分",
  团体辅导: "在关系现场里练习支持和表达",
};

function getCourseProductScore(course: Course): number {
  const purchaseIntentScore = course.price > 0 ? 32000 : 9000;
  const vipScore = course.isVip ? 5200 : 0;
  const discountScore = course.discount ? 4200 : 0;
  const couponScore = course.coupon ? 2600 : 0;

  return (
    course.learners +
    purchaseIntentScore +
    vipScore +
    discountScore +
    couponScore
  );
}

export function selectFeaturedCourseProducts(
  courses: Course[],
  limit = 3
): Course[] {
  return [...courses]
    .sort((a, b) => {
      const scoreDiff = getCourseProductScore(b) - getCourseProductScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return b.id - a.id;
    })
    .slice(0, limit);
}

export function getCourseMerchandisingImage(course: Course): string {
  return showcaseImages[course.category] ?? course.coverUrl;
}

function isRenderableMerchandisingAsset(
  asset: CourseProductMerchandisingAsset
) {
  return Boolean(asset.imageUrl);
}

function isRenderableVisualAsset(
  asset: CourseProductMerchandisingAsset
): asset is CourseProductMerchandisingAsset & { usage: "proof" | "gallery" } {
  return asset.usage !== "showcase" && isRenderableMerchandisingAsset(asset);
}

function isRenderableRichTextBlock(block: CourseProductRichTextBlock) {
  if (block.type === "image") return Boolean(block.imageUrl);
  if (block.type === "bullet_list") return block.items.length > 0;
  if (block.type === "faq") return Boolean(block.question && block.answer);
  if (block.type === "section_heading") return Boolean(block.title);
  return Boolean(block.body);
}

export function createCourseMerchandisingProfile({
  course,
  learningPath,
  merchandising,
  summaryRichText,
  totalDuration,
  totalLessons,
}: {
  course: CourseDetail;
  learningPath: CourseLearningPath;
  merchandising?: CourseProductMerchandisingContent;
  summaryRichText?: CourseProductSummaryRichText;
  totalDuration: number;
  totalLessons: number;
}): CourseMerchandisingProfile {
  const primaryAudience = course.suitableFor[0];
  const primaryOutcome = course.outcomes[0];
  const showcaseAsset = merchandising?.imageAssets.find(
    asset => asset.usage === "showcase" && isRenderableMerchandisingAsset(asset)
  );
  const visualAssets =
    merchandising?.imageAssets
      .filter(isRenderableVisualAsset)
      .slice(0, 3)
      .map(asset => {
        const visualAsset: CourseMerchandisingVisualAsset = {
          id: asset.id,
          title: asset.title,
          imageUrl: asset.imageUrl,
          altText: asset.altText ?? asset.title,
          usage: asset.usage,
        };
        if (asset.style) visualAsset.style = asset.style;
        if (asset.note) visualAsset.note = asset.note;
        return visualAsset;
      }) ?? [];
  const sellingPoints = merchandising?.sellingPoints.length
    ? merchandising.sellingPoints
    : course.outcomes.slice(0, 4);
  const buyerQuestion =
    merchandising?.subheadline ??
    (primaryAudience
      ? `如果你正在经历「${primaryAudience.title}」，这门课会先帮你把困扰拆成能练习的小步骤。`
      : "先看清这门课解决什么，再决定是否下单。");
  const richTextBlocks =
    merchandising?.richTextBlocks
      .filter(isRenderableRichTextBlock)
      .slice(0, 12) ?? [];
  const safeSummaryRichText =
    summaryRichText?.blocks
      .filter(block => block.text.trim().length > 0)
      .slice(0, 8) ?? [];

  return {
    promise: merchandising?.headline ?? categoryPromises[course.category],
    buyerQuestion,
    showcaseImageUrl:
      merchandising?.showcaseImageUrl ??
      showcaseAsset?.imageUrl ??
      getCourseMerchandisingImage(course),
    showcaseImageAlt:
      merchandising?.showcaseImageAlt ??
      showcaseAsset?.altText ??
      `${course.title}课程主视觉`,
    proofPoints: [
      {
        label: "适合状态",
        value: primaryAudience?.title ?? course.category,
        description: primaryAudience?.description ?? "从当下困扰进入课程。",
      },
      {
        label: "学习节奏",
        value: learningPath.paceLabel,
        description: `${learningPath.durationLabel}内完成一轮主题练习。`,
      },
      {
        label: "内容规模",
        value: `${totalLessons} 节`,
        description: `${totalDuration} 分钟课程，分阶段完成。`,
      },
      {
        label: "核心收获",
        value: primaryOutcome ?? "形成行动清单",
        description: learningPath.outcome,
      },
    ],
    sellingPoints,
    visualAssets,
    summaryRichText: safeSummaryRichText,
    richTextBlocks,
  };
}
