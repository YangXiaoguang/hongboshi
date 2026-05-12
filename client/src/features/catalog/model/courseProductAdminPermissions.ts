import {
  COURSE_CATALOG_PERMISSIONS,
  type UserProfile,
  userCan,
} from "@shared/domain";

export function getCourseProductAdminPermissions(
  user: Pick<UserProfile, "roles"> | null | undefined
) {
  const canRead = Boolean(user && userCan(user, COURSE_CATALOG_PERMISSIONS.read));
  const canEdit = Boolean(user && userCan(user, COURSE_CATALOG_PERMISSIONS.edit));
  const canReview = Boolean(
    user && userCan(user, COURSE_CATALOG_PERMISSIONS.review)
  );
  const canPublish = Boolean(
    user && userCan(user, COURSE_CATALOG_PERMISSIONS.publish)
  );
  const canPrice = Boolean(
    user && userCan(user, COURSE_CATALOG_PERMISSIONS.price)
  );

  return {
    canRead,
    canEdit,
    canReview,
    canPublish,
    canPrice,
    canMutate: canEdit || canReview || canPublish || canPrice,
  };
}
