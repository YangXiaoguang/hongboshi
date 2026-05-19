import type {
  CourseMembershipSourceType,
  UserAdminDetail,
} from "@shared/domain";

const sourceCopy = {
  checkout_order: "订单开通",
  admin_manual: "人工调整",
  direct_activation: "直接开通",
} satisfies Record<CourseMembershipSourceType, string>;

export interface UserMembershipSourceSummary {
  label: string;
  detail: string;
  updatedAt?: string;
}

export function createUserMembershipSourceSummary(
  membership: UserAdminDetail["membership"]
): UserMembershipSourceSummary {
  if (!membership.sourceType) {
    return {
      label: "来源未记录",
      detail: "当前会员权益缺少来源字段，请结合最近订单和会员操作审计核对。",
    };
  }

  if (membership.sourceType === "checkout_order") {
    return {
      label: sourceCopy.checkout_order,
      detail: membership.sourceOrderId
        ? `来源订单 ${membership.sourceOrderId}`
        : "来源订单未记录",
      updatedAt: membership.sourceUpdatedAt,
    };
  }

  if (membership.sourceType === "admin_manual") {
    return {
      label: sourceCopy.admin_manual,
      detail: membership.sourceActorId
        ? `操作者 ${membership.sourceActorId}`
        : "操作者未记录",
      updatedAt: membership.sourceUpdatedAt,
    };
  }

  return {
    label: sourceCopy.direct_activation,
    detail: "系统直接开通或旧权益迁移",
    updatedAt: membership.sourceUpdatedAt,
  };
}
