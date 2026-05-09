import { useCallback, useMemo, useState } from "react";
import type { Course } from "@shared/domain";
import { localCourseAccessRepository } from "../api/localCourseAccessRepository";
import {
  activateCourseMembership,
  grantPurchasedCourseAccess,
  hasActiveCourseMembership,
  resolveCourseAccess,
  type CourseAccessState,
} from "../model/courseAccess";

export function useCourseAccess() {
  const [state, setState] = useState(() => localCourseAccessRepository.load());

  const persist = useCallback((nextState: CourseAccessState) => {
    localCourseAccessRepository.save(nextState);
    return nextState;
  }, []);

  const ownedCourseIds = useMemo(
    () => new Set(state.ownedCourseIds),
    [state.ownedCourseIds]
  );

  const purchaseCourse = useCallback(
    (course: Course) => {
      setState((prev) => persist(grantPurchasedCourseAccess(prev, course)));
    },
    [persist]
  );

  const activateMembership = useCallback(() => {
    setState((prev) => persist(activateCourseMembership(prev)));
  }, [persist]);

  const getCourseAccess = useCallback(
    (course: Course) => resolveCourseAccess(state, course),
    [state]
  );

  const hasActiveMembership = useMemo(
    () => hasActiveCourseMembership(state.membership),
    [state.membership]
  );

  return {
    accessState: state,
    ownedCourseIds,
    ownedCourseCount: state.ownedCourseIds.length,
    orderCount: state.orders.length,
    membership: state.membership,
    hasActiveMembership,
    getCourseAccess,
    purchaseCourse,
    activateMembership,
  };
}
