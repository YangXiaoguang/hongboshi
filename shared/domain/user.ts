import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  MoneyAmountSchema,
  PageMetaSchema,
  PaginationQuerySchema,
} from "./common";
import { CourseMembershipSchema } from "./courseAccess";
import { AppointmentStatusSchema, CounselingChannelSchema } from "./counseling";
import { OrderStatusSchema, PurchasableTypeSchema } from "./order";
import {
  RiskEventSourceSchema,
  RiskEventStatusSchema,
  RiskLevelSchema,
} from "./risk";

export const UserRoleSchema = z.enum([
  "visitor",
  "member",
  "counselor",
  "catalog_viewer",
  "catalog_operator",
  "operator",
  "admin",
]);

export const LoginProviderSchema = z.enum(["phone", "wechat", "password"]);

export const ConsentTypeSchema = z.enum([
  "terms",
  "privacy",
  "assessment_notice",
  "counseling_notice",
  "minor_guardian_notice",
]);

export const AuthPermissionSchema = z.enum([
  "course_access:read",
  "course:purchase",
  "membership:activate",
  "counseling:fulfill",
  "admin:read",
  "admin:manage",
  "user:read",
  "user:membership",
  "order:read",
  "order:operate",
  "transaction:read",
  "transaction:operate",
  "finance:read",
  "finance:manage",
  "risk:read",
  "risk:review",
  "risk:sop",
  "audit:read",
  "audit:archive",
  "catalog:read",
  "catalog:edit",
  "catalog:review",
  "catalog:publish",
  "catalog:price",
]);

export const COURSE_CATALOG_PERMISSIONS = {
  read: "catalog:read",
  edit: "catalog:edit",
  review: "catalog:review",
  publish: "catalog:publish",
  price: "catalog:price",
} satisfies Record<string, z.infer<typeof AuthPermissionSchema>>;

export const USER_ADMIN_PERMISSIONS = {
  read: "user:read",
  membership: "user:membership",
} satisfies Record<string, z.infer<typeof AuthPermissionSchema>>;

export const ORDER_ADMIN_PERMISSIONS = {
  read: "order:read",
  operate: "order:operate",
} satisfies Record<string, z.infer<typeof AuthPermissionSchema>>;

export const TRANSACTION_ADMIN_PERMISSIONS = {
  read: "transaction:read",
  operate: "transaction:operate",
} satisfies Record<string, z.infer<typeof AuthPermissionSchema>>;

export const FINANCE_ADMIN_PERMISSIONS = {
  read: "finance:read",
  manage: "finance:manage",
} satisfies Record<string, z.infer<typeof AuthPermissionSchema>>;

export const RISK_ADMIN_PERMISSIONS = {
  read: "risk:read",
  review: "risk:review",
  sop: "risk:sop",
} satisfies Record<string, z.infer<typeof AuthPermissionSchema>>;

export const AUDIT_CENTER_PERMISSIONS = {
  read: "audit:read",
  archive: "audit:archive",
} satisfies Record<string, z.infer<typeof AuthPermissionSchema>>;

export const CURRENT_USER_CONSENT_VERSION = "2026.05";

export const UserProfileSchema = z.object({
  id: EntityIdSchema,
  displayName: z.string().min(1).max(40),
  phoneMasked: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  roles: z.array(UserRoleSchema).min(1),
  isMinor: z.boolean().default(false),
  guardianVerifiedAt: DateTimeLikeSchema.optional(),
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
});

export const UserConsentSchema = z.object({
  userId: EntityIdSchema,
  type: ConsentTypeSchema,
  version: z.string().min(1),
  acceptedAt: DateTimeLikeSchema,
});

export const LoginSessionSchema = z.object({
  user: UserProfileSchema,
  provider: LoginProviderSchema,
  accessTokenExpiresAt: DateTimeLikeSchema,
  consents: z.array(UserConsentSchema).default([]),
});

export const PhoneLoginRequestSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/),
  code: z.string().regex(/^\d{6}$/),
  acceptedConsent: z.literal(true),
  consentVersion: z.string().min(1).default(CURRENT_USER_CONSENT_VERSION),
});

export const WechatLoginRequestSchema = z.object({
  acceptedConsent: z.literal(true),
  consentVersion: z.string().min(1).default(CURRENT_USER_CONSENT_VERSION),
});

const RolePermissionMap = {
  visitor: ["course_access:read"],
  member: ["course_access:read", "course:purchase", "membership:activate"],
  counselor: ["course_access:read", "counseling:fulfill"],
  catalog_viewer: ["course_access:read", "admin:read", "catalog:read"],
  catalog_operator: [
    "course_access:read",
    "admin:read",
    "catalog:read",
    "catalog:edit",
    "catalog:review",
    "catalog:publish",
    "catalog:price",
  ],
  operator: [
    "course_access:read",
    "course:purchase",
    "membership:activate",
    "counseling:fulfill",
    "admin:read",
    "admin:manage",
    "user:read",
    "user:membership",
    "order:read",
    "order:operate",
    "transaction:read",
    "transaction:operate",
    "finance:read",
    "risk:read",
    "risk:review",
    "audit:read",
    "catalog:read",
    "catalog:edit",
    "catalog:review",
    "catalog:publish",
    "catalog:price",
  ],
  admin: [
    "course_access:read",
    "course:purchase",
    "membership:activate",
    "counseling:fulfill",
    "admin:read",
    "admin:manage",
    "user:read",
    "user:membership",
    "order:read",
    "order:operate",
    "transaction:read",
    "transaction:operate",
    "finance:read",
    "finance:manage",
    "risk:read",
    "risk:review",
    "risk:sop",
    "audit:read",
    "audit:archive",
    "catalog:read",
    "catalog:edit",
    "catalog:review",
    "catalog:publish",
    "catalog:price",
  ],
} satisfies Record<UserRole, AuthPermission[]>;

export function roleCan(role: UserRole, permission: AuthPermission): boolean {
  return (RolePermissionMap[role] as readonly AuthPermission[]).includes(
    permission
  );
}

export function userCan(
  user: Pick<UserProfile, "roles">,
  permission: AuthPermission
): boolean {
  return user.roles.some(role => roleCan(role, permission));
}

export const USER_ADMIN_PAGE_SIZE = 12;
export const ALL_USER_ADMIN_ROLE = "all";
export const ALL_USER_ADMIN_MEMBERSHIP_STATUS = "all";

export const UserAdminMembershipStatusSchema =
  CourseMembershipSchema.shape.status;

export const UserAdminRoleFilterSchema = z.union([
  UserRoleSchema,
  z.literal(ALL_USER_ADMIN_ROLE),
]);

export const UserAdminMembershipStatusFilterSchema = z.union([
  UserAdminMembershipStatusSchema,
  z.literal(ALL_USER_ADMIN_MEMBERSHIP_STATUS),
]);

export const UserAdminSortSchema = z.enum([
  "last_activity_desc",
  "created_desc",
  "updated_desc",
]);

export const UserAdminListQuerySchema = PaginationQuerySchema.extend({
  keyword: z.string().trim().max(80).default(""),
  role: UserAdminRoleFilterSchema.default(ALL_USER_ADMIN_ROLE),
  membershipStatus: UserAdminMembershipStatusFilterSchema.default(
    ALL_USER_ADMIN_MEMBERSHIP_STATUS
  ),
  sort: UserAdminSortSchema.default("last_activity_desc"),
  pageSize: z.number().int().min(1).max(50).default(USER_ADMIN_PAGE_SIZE),
});

export const UserAdminPrivacyFlagsSchema = z.object({
  isMinor: z.boolean(),
  guardianVerified: z.boolean(),
  phoneMasked: z.boolean(),
});

export const UserAdminListItemSchema = z.object({
  id: EntityIdSchema,
  displayName: z.string().min(1),
  phoneMasked: z.string().optional(),
  roles: z.array(UserRoleSchema).min(1),
  membershipStatus: UserAdminMembershipStatusSchema,
  membershipPlanName: z.string().min(1).optional(),
  membershipExpiresAt: DateTimeLikeSchema.optional(),
  ownedCourseCount: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  counselingAppointmentCount: z.number().int().nonnegative(),
  activeRiskCount: z.number().int().nonnegative(),
  latestOrderStatus: OrderStatusSchema.optional(),
  lastActivityAt: DateTimeLikeSchema.optional(),
  createdAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
  privacyFlags: UserAdminPrivacyFlagsSchema,
});

export const UserAdminSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  activeMembershipCount: z.number().int().nonnegative(),
  expiredMembershipCount: z.number().int().nonnegative(),
  minorCount: z.number().int().nonnegative(),
  activeRiskCount: z.number().int().nonnegative(),
});

export const UserAdminFilterOptionsSchema = z.object({
  roles: z.array(UserRoleSchema),
  membershipStatuses: z.array(UserAdminMembershipStatusSchema),
});

export const UserAdminListResultSchema = z.object({
  items: z.array(UserAdminListItemSchema),
  meta: PageMetaSchema,
  summary: UserAdminSummarySchema,
  filters: UserAdminFilterOptionsSchema,
  query: UserAdminListQuerySchema,
  serverTime: DateTimeLikeSchema,
});

export const UserAdminConsentSummarySchema = z.object({
  type: ConsentTypeSchema,
  version: z.string().min(1),
  acceptedAt: DateTimeLikeSchema,
});

export const UserAdminMembershipSummarySchema = z.object({
  status: UserAdminMembershipStatusSchema,
  planName: z.string().min(1).optional(),
  activatedAt: DateTimeLikeSchema.optional(),
  expiresAt: DateTimeLikeSchema.optional(),
  activeNow: z.boolean(),
});

const UserAdminMembershipPlanNameSchema = z.string().trim().min(2).max(40);
const UserAdminMembershipActionReasonSchema = z.string().trim().min(4).max(240);

export const UserAdminMembershipActionSchema = z.enum([
  "activate",
  "extend",
  "expire",
  "adjust_plan",
]);

export const UserAdminMembershipActionRequestSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("activate"),
      planName: UserAdminMembershipPlanNameSchema,
      durationDays: z.number().int().min(1).max(1095),
      reason: UserAdminMembershipActionReasonSchema,
    }),
    z.object({
      action: z.literal("extend"),
      durationDays: z.number().int().min(1).max(1095),
      reason: UserAdminMembershipActionReasonSchema,
    }),
    z.object({
      action: z.literal("expire"),
      reason: UserAdminMembershipActionReasonSchema,
    }),
    z.object({
      action: z.literal("adjust_plan"),
      planName: UserAdminMembershipPlanNameSchema,
      reason: UserAdminMembershipActionReasonSchema,
    }),
  ]
);

export const UserAdminMembershipAuditEventSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  actorId: EntityIdSchema,
  actorRoles: z.array(UserRoleSchema).min(1),
  action: UserAdminMembershipActionSchema,
  reason: UserAdminMembershipActionReasonSchema,
  before: CourseMembershipSchema,
  after: CourseMembershipSchema,
  createdAt: DateTimeLikeSchema,
});

export const UserAdminOrderSummarySchema = z.object({
  id: EntityIdSchema,
  status: OrderStatusSchema,
  itemTypes: z.array(PurchasableTypeSchema).min(1),
  title: z.string().min(1),
  payableAmount: MoneyAmountSchema,
  createdAt: DateTimeLikeSchema,
  paidAt: DateTimeLikeSchema.optional(),
});

export const UserAdminCourseAccessSummarySchema = z.object({
  ownedCourseIds: z.array(z.number().int().positive()),
  ownedCourseCount: z.number().int().nonnegative(),
  orderCount: z.number().int().nonnegative(),
  recentOrders: z.array(UserAdminOrderSummarySchema),
});

export const UserAdminCounselingAppointmentSummarySchema = z.object({
  appointmentId: EntityIdSchema,
  status: AppointmentStatusSchema,
  counselorName: z.string().min(1),
  channel: CounselingChannelSchema,
  startsAt: DateTimeLikeSchema,
  createdAt: DateTimeLikeSchema,
  orderStatus: OrderStatusSchema.optional(),
  riskLevel: RiskLevelSchema.optional(),
});

export const UserAdminCounselingSummarySchema = z.object({
  totalCount: z.number().int().nonnegative(),
  upcomingCount: z.number().int().nonnegative(),
  recentAppointments: z.array(UserAdminCounselingAppointmentSummarySchema),
});

export const UserAdminRiskEventSummarySchema = z.object({
  id: EntityIdSchema,
  source: RiskEventSourceSchema,
  riskLevel: RiskLevelSchema,
  status: RiskEventStatusSchema,
  createdAt: DateTimeLikeSchema,
});

export const UserAdminRiskSummarySchema = z.object({
  openCount: z.number().int().nonnegative(),
  highestRiskLevel: RiskLevelSchema.optional(),
  recentEvents: z.array(UserAdminRiskEventSummarySchema),
});

export const UserAdminDetailSchema = z.object({
  user: UserAdminListItemSchema,
  consents: z.array(UserAdminConsentSummarySchema),
  membership: UserAdminMembershipSummarySchema,
  membershipAuditEvents: z
    .array(UserAdminMembershipAuditEventSchema)
    .default([]),
  courseAccess: UserAdminCourseAccessSummarySchema,
  counseling: UserAdminCounselingSummarySchema,
  risk: UserAdminRiskSummarySchema,
  privacyNotice: z.string().min(1),
  generatedAt: DateTimeLikeSchema,
});

export const UserAdminMembershipMutationResultSchema = z.object({
  detail: UserAdminDetailSchema,
  auditEvent: UserAdminMembershipAuditEventSchema,
  auditEvents: z.array(UserAdminMembershipAuditEventSchema),
  serverTime: DateTimeLikeSchema,
});

export type UserRole = z.infer<typeof UserRoleSchema>;
export type LoginProvider = z.infer<typeof LoginProviderSchema>;
export type ConsentType = z.infer<typeof ConsentTypeSchema>;
export type AuthPermission = z.infer<typeof AuthPermissionSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserConsent = z.infer<typeof UserConsentSchema>;
export type LoginSession = z.infer<typeof LoginSessionSchema>;
export type PhoneLoginRequest = z.infer<typeof PhoneLoginRequestSchema>;
export type WechatLoginRequest = z.infer<typeof WechatLoginRequestSchema>;
export type UserAdminMembershipStatus = z.infer<
  typeof UserAdminMembershipStatusSchema
>;
export type UserAdminMembershipAction = z.infer<
  typeof UserAdminMembershipActionSchema
>;
export type UserAdminMembershipActionRequest = z.infer<
  typeof UserAdminMembershipActionRequestSchema
>;
export type UserAdminMembershipAuditEvent = z.infer<
  typeof UserAdminMembershipAuditEventSchema
>;
export type UserAdminListQuery = z.infer<typeof UserAdminListQuerySchema>;
export type UserAdminListItem = z.infer<typeof UserAdminListItemSchema>;
export type UserAdminListResult = z.infer<typeof UserAdminListResultSchema>;
export type UserAdminDetail = z.infer<typeof UserAdminDetailSchema>;
export type UserAdminMembershipMutationResult = z.infer<
  typeof UserAdminMembershipMutationResultSchema
>;
