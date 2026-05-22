import type {
  CourseProductReviewAction,
  CourseProductReviewStatus,
  CourseProductStatus,
} from "@shared/domain";

export const courseProductStatusCopy = {
  draft: "草稿",
  published: "已上架",
  unpublished: "已下架",
  archived: "已归档",
} satisfies Record<CourseProductStatus, string>;

export const courseProductReviewCopy = {
  not_submitted: "未提交",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
} satisfies Record<CourseProductReviewStatus, string>;

export const courseProductReviewActionCopy = {
  submit: "提交审核",
  approve: "通过审核",
  reject: "驳回审核",
  withdraw: "撤回审核",
} satisfies Record<CourseProductReviewAction, string>;
