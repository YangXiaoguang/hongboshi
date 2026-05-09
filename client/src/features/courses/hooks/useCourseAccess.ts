import { useCallback, useEffect, useMemo, useState } from "react";
import type { Course } from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import {
  CourseAccessRequestError,
  httpCourseAccessRepository,
} from "../api/httpCourseAccessRepository";
import { localCourseAccessRepository } from "../api/localCourseAccessRepository";
import {
  activateCourseMembership,
  grantPurchasedCourseAccess,
  hasActiveCourseMembership,
  LOCAL_COURSE_ACCESS_USER_ID,
  resolveCourseAccess,
  type CourseAccessState,
} from "../model/courseAccess";

export function useCourseAccess() {
  const { user, openLoginModal } = useAuth();
  const accessUserId = user?.id ?? LOCAL_COURSE_ACCESS_USER_ID;
  const [state, setState] = useState(() =>
    localCourseAccessRepository.load(accessUserId)
  );
  const [isSyncing, setIsSyncing] = useState(true);
  const [accessError, setAccessError] = useState<string | undefined>();

  const persist = useCallback(
    (nextState: CourseAccessState) => {
      localCourseAccessRepository.save(nextState, accessUserId);
      return nextState;
    },
    [accessUserId]
  );

  useEffect(() => {
    let mounted = true;
    setIsSyncing(true);
    setState(localCourseAccessRepository.load(accessUserId));

    httpCourseAccessRepository
      .load(accessUserId)
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
  }, [accessUserId, persist]);

  const ownedCourseIds = useMemo(
    () => new Set(state.ownedCourseIds),
    [state.ownedCourseIds]
  );

  const requireLoggedInAccess = useCallback(() => {
    setAccessError("请先登录后继续操作");
    openLoginModal();
    return "auth_required" as const;
  }, [openLoginModal]);

  const shouldUseLocalFallback = (err: unknown) => {
    if (!(err instanceof CourseAccessRequestError)) return true;
    return !["UNAUTHORIZED", "FORBIDDEN"].includes(err.code ?? "");
  };

  const purchaseCourse = useCallback(
    async (course: Course) => {
      if (!user) return requireLoggedInAccess();

      setIsSyncing(true);
      try {
        const remoteState = await httpCourseAccessRepository.purchaseCourse(
          course.id,
          accessUserId
        );
        setState(persist(remoteState));
        setAccessError(undefined);
        return "api" as const;
      } catch (err) {
        if (!shouldUseLocalFallback(err)) {
          setAccessError(err instanceof Error ? err.message : "请先登录后继续操作");
          openLoginModal();
          return "auth_required" as const;
        }

        setState((prev) => persist(grantPurchasedCourseAccess(prev, course)));
        setAccessError(err instanceof Error ? err.message : "课程权益服务暂时不可用");
        return "fallback" as const;
      } finally {
        setIsSyncing(false);
      }
    },
    [accessUserId, openLoginModal, persist, requireLoggedInAccess, user]
  );

  const activateMembership = useCallback(() => {
    if (!user) return Promise.resolve(requireLoggedInAccess());

    setIsSyncing(true);
    return httpCourseAccessRepository
      .activateMembership(accessUserId)
      .then((remoteState) => {
        setState(persist(remoteState));
        setAccessError(undefined);
        return "api" as const;
      })
      .catch((err) => {
        if (!shouldUseLocalFallback(err)) {
          setAccessError(err instanceof Error ? err.message : "请先登录后继续操作");
          openLoginModal();
          return "auth_required" as const;
        }

        setState((prev) => persist(activateCourseMembership(prev)));
        setAccessError(err instanceof Error ? err.message : "课程权益服务暂时不可用");
        return "fallback" as const;
      })
      .finally(() => {
        setIsSyncing(false);
      });
  }, [accessUserId, openLoginModal, persist, requireLoggedInAccess, user]);

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
