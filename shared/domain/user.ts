import { z } from "zod";
import { DateTimeLikeSchema, EntityIdSchema } from "./common";

export const UserRoleSchema = z.enum([
  "visitor",
  "member",
  "counselor",
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
});

export type UserRole = z.infer<typeof UserRoleSchema>;
export type LoginProvider = z.infer<typeof LoginProviderSchema>;
export type ConsentType = z.infer<typeof ConsentTypeSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserConsent = z.infer<typeof UserConsentSchema>;
export type LoginSession = z.infer<typeof LoginSessionSchema>;
