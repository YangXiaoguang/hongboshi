export const COURSE_MEMBERSHIP_REOPEN_INTENT = "renew_membership";
export const COURSE_MEMBERSHIP_REOPEN_PATH = `/courses?checkout=membership&intent=${COURSE_MEMBERSHIP_REOPEN_INTENT}`;

function toSearchParams(search: string | URLSearchParams) {
  if (search instanceof URLSearchParams) return search;
  return new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
}

export function isCourseMembershipCheckoutIntent(
  search: string | URLSearchParams
): boolean {
  return toSearchParams(search).get("checkout") === "membership";
}

export function getCourseMembershipCheckoutIntent(
  search: string | URLSearchParams
): string | undefined {
  return toSearchParams(search).get("intent") ?? undefined;
}
