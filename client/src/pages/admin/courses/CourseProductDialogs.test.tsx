import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  COURSE_CATEGORIES,
  COURSE_TYPES,
  type CourseProductListItem,
} from "@shared/domain";
import {
  CourseProductBasicInfoDialog,
  type CourseProductBasicInfoFormState,
} from "./CourseProductBasicInfoDialog";
import {
  CourseProductPriceDialog,
  type CourseProductPriceFormState,
} from "./CourseProductPriceDialog";
import { CourseProductReviewDialog } from "./CourseProductReviewDialog";
import { CourseProductStatusDialog } from "./CourseProductStatusDialog";

const product = {
  id: "course_product_test",
  courseId: 101,
  title: "情绪管理训练课",
  coverUrl: "https://example.com/course-cover.jpg",
  category: COURSE_CATEGORIES[0],
  type: COURSE_TYPES[0],
  instructorName: "李老师",
  learners: 1280,
  price: {
    currency: "CNY",
    amount: 199,
    originalAmount: 399,
    isFree: false,
    memberIncluded: true,
  },
  status: "unpublished",
  reviewStatus: "pending",
  source: "seed",
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-05-21T10:00:00.000Z",
} satisfies CourseProductListItem;

function noop() {
  return undefined;
}

describe("course product action dialogs", () => {
  it("renders status dialog independently", () => {
    const html = renderToStaticMarkup(
      <CourseProductStatusDialog
        product={product}
        targetStatus="published"
        reason="内容完成复核"
        isSubmitting={false}
        onReasonChange={noop}
        onCancel={noop}
        onSubmit={noop}
      />
    );

    expect(html).toContain("上架课程商品");
    expect(html).toContain(product.title);
    expect(html).toContain("确认上架");
  });

  it("renders review dialog independently", () => {
    const html = renderToStaticMarkup(
      <CourseProductReviewDialog
        product={product}
        action="approve"
        targetReviewStatus="approved"
        reason="课程内容和素材已完成审核确认"
        isSubmitting={false}
        onReasonChange={noop}
        onCancel={noop}
        onSubmit={noop}
      />
    );

    expect(html).toContain("通过审核");
    expect(html).toContain("待审核");
    expect(html).toContain("已通过");
  });

  it("renders basic info dialog independently", () => {
    const form: CourseProductBasicInfoFormState = {
      title: product.title,
      coverUrl: product.coverUrl,
      category: product.category,
      type: product.type,
      instructorName: product.instructorName,
      learners: String(product.learners),
      reason: "课程封面和讲师信息完成校对",
    };
    const html = renderToStaticMarkup(
      <CourseProductBasicInfoDialog
        product={product}
        form={form}
        isSubmitting={false}
        onFormChange={noop}
        onCancel={noop}
        onSubmit={noop}
      />
    );

    expect(html).toContain("基础信息");
    expect(html).toContain("课程标题");
    expect(html).toContain("保存信息");
  });

  it("renders price dialog independently", () => {
    const form: CourseProductPriceFormState = {
      amount: "199",
      originalAmount: "399",
      isFree: false,
      memberIncluded: true,
      reason: "配合课程专题活动调整本期价格",
    };
    const html = renderToStaticMarkup(
      <CourseProductPriceDialog
        product={product}
        form={form}
        isSubmitting={false}
        onFormChange={noop}
        onCancel={noop}
        onSubmit={noop}
      />
    );

    expect(html).toContain("价格编辑");
    expect(html).toContain("会员权益内");
    expect(html).toContain("保存价格");
  });
});
