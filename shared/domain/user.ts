import { z } from "zod";
import { DateTimeLikeSchema, EntityIdSchema } from "./common";

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

export type UserRole = z.infer<typeof UserRoleSchema>;
export type LoginProvider = z.infer<typeof LoginProviderSchema>;
export type ConsentType = z.infer<typeof ConsentTypeSchema>;
export type AuthPermission = z.infer<typeof AuthPermissionSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserConsent = z.infer<typeof UserConsentSchema>;
export type LoginSession = z.infer<typeof LoginSessionSchema>;
export type PhoneLoginRequest = z.infer<typeof PhoneLoginRequestSchema>;
export type WechatLoginRequest = z.infer<typeof WechatLoginRequestSchema>;
