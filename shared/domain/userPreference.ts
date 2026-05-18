import { z } from "zod";
import {
  DateTimeLikeSchema,
  EntityIdSchema,
  LegacyNumericIdSchema,
} from "./common";

export const UserFavoriteCourseSourceSchema = z.enum([
  "home",
  "course_list",
  "course_detail",
  "course_learning",
  "growth_space",
  "personal_center",
  "unknown",
]);

export const UserFavoriteCourseSchema = z.object({
  courseId: LegacyNumericIdSchema,
  source: UserFavoriteCourseSourceSchema.default("unknown"),
  favoritedAt: DateTimeLikeSchema,
  updatedAt: DateTimeLikeSchema,
});

export const UserCouponClaimStatusSchema = z.enum([
  "claimed",
  "used",
  "expired",
]);

export const UserCouponDisplayStatusSchema = z.enum([
  "claimable",
  "claimed",
  "used",
  "expired",
]);

export const UserCouponClaimSchema = z.object({
  id: EntityIdSchema,
  marketingRuleId: EntityIdSchema,
  status: UserCouponClaimStatusSchema.default("claimed"),
  claimedAt: DateTimeLikeSchema,
  expiresAt: DateTimeLikeSchema.optional(),
  usedAt: DateTimeLikeSchema.optional(),
  usedOrderId: EntityIdSchema.optional(),
  updatedAt: DateTimeLikeSchema,
});

export const UserPreferenceSchema = z.object({
  userId: EntityIdSchema,
  favoriteCourses: z.array(UserFavoriteCourseSchema).default([]),
  couponClaims: z.array(UserCouponClaimSchema).default([]),
  updatedAt: DateTimeLikeSchema,
});

export const UserPreferenceResultSchema = z.object({
  preference: UserPreferenceSchema,
  generatedAt: DateTimeLikeSchema,
});

export const UserPreferenceFavoriteUpdateRequestSchema = z.object({
  favoriteCourseIds: z.array(LegacyNumericIdSchema).max(200).default([]),
  source: UserFavoriteCourseSourceSchema.default("unknown"),
});

export const UserPreferenceCouponClaimRequestSchema = z.object({
  marketingRuleId: EntityIdSchema,
});

export const UserPreferenceCouponUseRequestSchema = z.object({
  couponClaimId: EntityIdSchema,
  orderId: EntityIdSchema,
});

export type UserFavoriteCourseSource = z.infer<
  typeof UserFavoriteCourseSourceSchema
>;
export type UserFavoriteCourse = z.infer<typeof UserFavoriteCourseSchema>;
export type UserCouponClaimStatus = z.infer<typeof UserCouponClaimStatusSchema>;
export type UserCouponDisplayStatus = z.infer<
  typeof UserCouponDisplayStatusSchema
>;
export type UserCouponClaim = z.infer<typeof UserCouponClaimSchema>;
export type UserPreference = z.infer<typeof UserPreferenceSchema>;
export type UserPreferenceResult = z.infer<typeof UserPreferenceResultSchema>;
export type UserPreferenceFavoriteUpdateRequest = z.infer<
  typeof UserPreferenceFavoriteUpdateRequestSchema
>;
export type UserPreferenceCouponClaimRequest = z.infer<
  typeof UserPreferenceCouponClaimRequestSchema
>;
export type UserPreferenceCouponUseRequest = z.infer<
  typeof UserPreferenceCouponUseRequestSchema
>;

export function createEmptyUserPreference({
  userId,
  now = new Date().toISOString(),
}: {
  userId: string;
  now?: string;
}): UserPreference {
  return UserPreferenceSchema.parse({
    userId,
    favoriteCourses: [],
    couponClaims: [],
    updatedAt: now,
  });
}

export function normalizeUserPreference(
  preference: unknown
): UserPreference | undefined {
  const parsed = UserPreferenceSchema.safeParse(preference);
  if (!parsed.success) return undefined;

  const favoriteByCourseId = new Map<number, UserFavoriteCourse>();
  for (const favorite of parsed.data.favoriteCourses) {
    if (!favoriteByCourseId.has(favorite.courseId)) {
      favoriteByCourseId.set(favorite.courseId, favorite);
    }
  }

  const couponByRuleId = new Map<string, UserCouponClaim>();
  for (const coupon of parsed.data.couponClaims) {
    if (!couponByRuleId.has(coupon.marketingRuleId)) {
      couponByRuleId.set(coupon.marketingRuleId, coupon);
    }
  }

  return UserPreferenceSchema.parse({
    ...parsed.data,
    favoriteCourses: Array.from(favoriteByCourseId.values()).sort(
      (left, right) =>
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
        right.courseId - left.courseId
    ),
    couponClaims: Array.from(couponByRuleId.values()).sort(
      (left, right) =>
        Date.parse(right.claimedAt) - Date.parse(left.claimedAt) ||
        right.marketingRuleId.localeCompare(left.marketingRuleId)
    ),
  });
}

export function updateUserFavoriteCourses({
  preference,
  favoriteCourseIds,
  source = "unknown",
  now = new Date().toISOString(),
}: {
  preference: UserPreference;
  favoriteCourseIds: number[];
  source?: UserFavoriteCourseSource;
  now?: string;
}): UserPreference {
  const existingByCourseId = new Map(
    preference.favoriteCourses.map(favorite => [favorite.courseId, favorite])
  );
  const uniqueCourseIds = Array.from(new Set(favoriteCourseIds));

  return UserPreferenceSchema.parse({
    ...preference,
    favoriteCourses: uniqueCourseIds.map(courseId => {
      const existing = existingByCourseId.get(courseId);
      return UserFavoriteCourseSchema.parse({
        courseId,
        source: existing?.source ?? source,
        favoritedAt: existing?.favoritedAt ?? now,
        updatedAt: now,
      });
    }),
    updatedAt: now,
  });
}

function safeIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

export function claimUserCoupon({
  preference,
  marketingRuleId,
  expiresAt,
  now = new Date().toISOString(),
}: {
  preference: UserPreference;
  marketingRuleId: string;
  expiresAt?: string;
  now?: string;
}): UserPreference {
  const existing = preference.couponClaims.find(
    claim => claim.marketingRuleId === marketingRuleId
  );
  if (existing) return UserPreferenceSchema.parse(preference);

  return UserPreferenceSchema.parse({
    ...preference,
    couponClaims: [
      UserCouponClaimSchema.parse({
        id: `coupon_${safeIdPart(preference.userId)}_${safeIdPart(marketingRuleId)}`,
        marketingRuleId,
        status: "claimed",
        claimedAt: now,
        expiresAt,
        updatedAt: now,
      }),
      ...preference.couponClaims,
    ],
    updatedAt: now,
  });
}

export function useUserCouponClaim({
  preference,
  couponClaimId,
  orderId,
  now = new Date().toISOString(),
}: {
  preference: UserPreference;
  couponClaimId: string;
  orderId: string;
  now?: string;
}): UserPreference {
  const existing = preference.couponClaims.find(
    claim => claim.id === couponClaimId
  );
  if (!existing) throw new Error("USER_COUPON_CLAIM_NOT_FOUND");

  if (existing.status === "used") {
    if (existing.usedOrderId === orderId) {
      return UserPreferenceSchema.parse(preference);
    }
    throw new Error("USER_COUPON_ALREADY_USED");
  }

  if (existing.status === "expired") throw new Error("USER_COUPON_EXPIRED");

  if (existing.expiresAt && Date.parse(existing.expiresAt) <= Date.parse(now)) {
    throw new Error("USER_COUPON_EXPIRED");
  }

  return UserPreferenceSchema.parse({
    ...preference,
    couponClaims: preference.couponClaims.map(claim =>
      claim.id === couponClaimId
        ? UserCouponClaimSchema.parse({
            ...claim,
            status: "used",
            usedAt: now,
            usedOrderId: orderId,
            updatedAt: now,
          })
        : claim
    ),
    updatedAt: now,
  });
}
