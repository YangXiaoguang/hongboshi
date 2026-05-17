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

export const UserPreferenceSchema = z.object({
  userId: EntityIdSchema,
  favoriteCourses: z.array(UserFavoriteCourseSchema).default([]),
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

export type UserFavoriteCourseSource = z.infer<
  typeof UserFavoriteCourseSourceSchema
>;
export type UserFavoriteCourse = z.infer<typeof UserFavoriteCourseSchema>;
export type UserPreference = z.infer<typeof UserPreferenceSchema>;
export type UserPreferenceResult = z.infer<typeof UserPreferenceResultSchema>;
export type UserPreferenceFavoriteUpdateRequest = z.infer<
  typeof UserPreferenceFavoriteUpdateRequestSchema
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

  return UserPreferenceSchema.parse({
    ...parsed.data,
    favoriteCourses: Array.from(favoriteByCourseId.values()).sort(
      (left, right) =>
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
        right.courseId - left.courseId
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
