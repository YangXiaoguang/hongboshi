import { useCallback, useEffect, useMemo, useState } from "react";
import type { Course } from "@shared/domain";
import { httpCourseAccessRepository } from "../api/httpCourseAccessRepository";
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
  const [isSyncing, setIsSyncing] = useState(true);
  const [accessError, setAccessError] = useState<string | undefined>();

  const persist = useCallback((nextState: CourseAccessState) => {
    localCourseAccessRepository.save(nextState);
    return nextState;
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsSyncing(true);

    httpCourseAccessRepository
      .load()
      .then((remoteState) => {
        if (!mounted) return;
        setState(persist(remoteState));
        setAccessError(undefined);
      })
      .catch((err) => {
        if (!mounted) return;
        setAccessError(err instanceof Error ? err.message : "课程权益服务暂时不可用");
      })
      .finally(() => {
        if (mounted) setIsSyncing(false);
      });

    return () => {
      mounted = false;
    };
  }, [persist]);

  const ownedCourseIds = useMemo(
    () => new Set(state.ownedCourseIds),
    [state.ownedCourseIds]
  );

  const purchaseCourse = useCallback(
    async (course: Course) => {
      setIsSyncing(true);
      try {
        const remoteState = await httpCourseAccessRepository.purchaseCourse(course.id);
        setState(persist(remoteState));
        setAccessError(undefined);
        return "api" as const;
      } catch (err) {
        setState((prev) => persist(grantPurchasedCourseAccess(prev, course)));
        setAccessError(err instanceof Error ? err.message : "课程权益服务暂时不可用");
        return "fallback" as const;
      } finally {
        setIsSyncing(false);
      }
    },
    [persist]
  );

  const activateMembership = useCallback(() => {
    setIsSyncing(true);
    return httpCourseAccessRepository
      .activateMembership()
      .then((remoteState) => {
        setState(persist(remoteState));
        setAccessError(undefined);
        return "api" as const;
      })
      .catch((err) => {
        setState((prev) => persist(activateCourseMembership(prev)));
        setAccessError(err instanceof Error ? err.message : "课程权益服务暂时不可用");
        return "fallback" as const;
      })
      .finally(() => {
        setIsSyncing(false);
      });
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
    isSyncing,
    accessError,
    getCourseAccess,
    purchaseCourse,
    activateMembership,
  };
}
