import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Course,
  OrderAfterSalesCreateRequest,
  OrderAfterSalesListResult,
  OrderAfterSalesMutationResult,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import {
  CourseAccessRequestError,
  httpCourseAccessRepository,
} from "../api/httpCourseAccessRepository";
import { localCourseAccessRepository } from "../api/localCourseAccessRepository";
import {
  activateCourseMembership,
  cancelCourseCheckoutOrder,
  createCourseCheckoutOrder,
  createMembershipCheckoutOrder as createMembershipCheckoutOrderModel,
  hasActiveCourseMembership,
  LOCAL_COURSE_ACCESS_USER_ID,
  payCourseCheckoutOrder,
  resolveCourseAccess,
  type CourseAccessState,
  type CourseCheckoutMode,
  type CourseCheckoutOrderResult,
} from "../model/courseAccess";
import type { CourseCheckoutPaymentChannel } from "../model/courseCheckout";

type CourseCheckoutActionResult = {
  syncMode: "api" | "fallback";
  checkout: CourseCheckoutOrderResult;
};

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
      .then(remoteState => {
        if (!mounted) return;
        setState(persist(remoteState));
        setAccessError(undefined);
      })
      .catch(err => {
        if (!mounted) return;
        setAccessError(
          err instanceof Error ? err.message : "课程权益服务暂时不可用"
        );
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

  const shouldUseCheckoutLocalFallback = (err: unknown) => {
    if (!(err instanceof CourseAccessRequestError)) return true;
    return ![
      "BAD_REQUEST",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "VALIDATION_ERROR",
    ].includes(err.code ?? "");
  };

  const isAuthorizationError = (err: unknown) =>
    err instanceof CourseAccessRequestError &&
    ["UNAUTHORIZED", "FORBIDDEN"].includes(err.code ?? "");

  const createCheckoutOrder = useCallback(
    async (
      course: Course,
      mode: CourseCheckoutMode,
      couponClaimId?: string
    ): Promise<CourseCheckoutActionResult | "auth_required"> => {
      if (!user) return requireLoggedInAccess();

      setIsSyncing(true);
      try {
        const checkout =
          mode === "membership"
            ? await httpCourseAccessRepository.createMembershipCheckoutOrder(
                accessUserId
              )
            : await httpCourseAccessRepository.createCheckoutOrder(
                course.id,
                mode,
                accessUserId,
                couponClaimId
              );
        setState(persist(checkout.accessState));
        setAccessError(undefined);
        return { syncMode: "api", checkout };
      } catch (err) {
        if (!shouldUseCheckoutLocalFallback(err)) {
          setAccessError(
            err instanceof Error ? err.message : "请先登录后继续操作"
          );
          if (isAuthorizationError(err)) {
            openLoginModal();
            return "auth_required" as const;
          }
          throw err;
        }

        const checkout =
          mode === "membership"
            ? createMembershipCheckoutOrderModel(
                localCourseAccessRepository.load(accessUserId),
                undefined,
                accessUserId
              )
            : createCourseCheckoutOrder(
                localCourseAccessRepository.load(accessUserId),
                course,
                mode,
                undefined,
                accessUserId
              );
        setState(persist(checkout.accessState));
        setAccessError(
          err instanceof Error ? err.message : "课程订单服务暂时不可用"
        );
        return { syncMode: "fallback", checkout };
      } finally {
        setIsSyncing(false);
      }
    },
    [accessUserId, openLoginModal, persist, requireLoggedInAccess, user]
  );

  const createMembershipCheckoutOrder = useCallback(async (): Promise<
    CourseCheckoutActionResult | "auth_required"
  > => {
    if (!user) return requireLoggedInAccess();

    setIsSyncing(true);
    try {
      const checkout =
        await httpCourseAccessRepository.createMembershipCheckoutOrder(
          accessUserId
        );
      setState(persist(checkout.accessState));
      setAccessError(undefined);
      return { syncMode: "api", checkout };
    } catch (err) {
      if (!shouldUseCheckoutLocalFallback(err)) {
        setAccessError(
          err instanceof Error ? err.message : "请先登录后继续操作"
        );
        if (isAuthorizationError(err)) {
          openLoginModal();
          return "auth_required" as const;
        }
        throw err;
      }

      const checkout = createMembershipCheckoutOrderModel(
        localCourseAccessRepository.load(accessUserId),
        undefined,
        accessUserId
      );
      setState(persist(checkout.accessState));
      setAccessError(
        err instanceof Error ? err.message : "会员订单服务暂时不可用"
      );
      return { syncMode: "fallback", checkout };
    } finally {
      setIsSyncing(false);
    }
  }, [accessUserId, openLoginModal, persist, requireLoggedInAccess, user]);

  const payCheckoutOrder = useCallback(
    async (
      orderId: string,
      paymentChannel: CourseCheckoutPaymentChannel
    ): Promise<CourseCheckoutActionResult | "auth_required"> => {
      if (!user) return requireLoggedInAccess();

      setIsSyncing(true);
      try {
        const checkout = await httpCourseAccessRepository.payCheckoutOrder(
          orderId,
          paymentChannel,
          accessUserId
        );
        setState(persist(checkout.accessState));
        setAccessError(undefined);
        return { syncMode: "api", checkout };
      } catch (err) {
        if (!shouldUseCheckoutLocalFallback(err)) {
          setAccessError(
            err instanceof Error ? err.message : "请先登录后继续操作"
          );
          if (isAuthorizationError(err)) {
            openLoginModal();
            return "auth_required" as const;
          }
          throw err;
        }

        const checkout = payCourseCheckoutOrder(
          localCourseAccessRepository.load(accessUserId),
          orderId,
          paymentChannel
        );
        setState(persist(checkout.accessState));
        setAccessError(
          err instanceof Error ? err.message : "课程支付服务暂时不可用"
        );
        return { syncMode: "fallback", checkout };
      } finally {
        setIsSyncing(false);
      }
    },
    [accessUserId, openLoginModal, persist, requireLoggedInAccess, user]
  );

  const cancelCheckoutOrder = useCallback(
    async (
      orderId: string
    ): Promise<CourseCheckoutActionResult | "auth_required"> => {
      if (!user) return requireLoggedInAccess();

      setIsSyncing(true);
      try {
        const checkout = await httpCourseAccessRepository.cancelCheckoutOrder(
          orderId,
          accessUserId
        );
        setState(persist(checkout.accessState));
        setAccessError(undefined);
        return { syncMode: "api", checkout };
      } catch (err) {
        if (!shouldUseCheckoutLocalFallback(err)) {
          setAccessError(
            err instanceof Error ? err.message : "请先登录后继续操作"
          );
          if (isAuthorizationError(err)) {
            openLoginModal();
            return "auth_required" as const;
          }
          throw err;
        }

        const checkout = cancelCourseCheckoutOrder(
          localCourseAccessRepository.load(accessUserId),
          orderId
        );
        setState(persist(checkout.accessState));
        setAccessError(
          err instanceof Error ? err.message : "课程订单取消服务暂时不可用"
        );
        return { syncMode: "fallback", checkout };
      } finally {
        setIsSyncing(false);
      }
    },
    [accessUserId, openLoginModal, persist, requireLoggedInAccess, user]
  );

  const loadOrderAfterSalesRequests = useCallback(
    async (
      orderId: string
    ): Promise<OrderAfterSalesListResult | "auth_required"> => {
      if (!user) return requireLoggedInAccess();

      try {
        const result =
          await httpCourseAccessRepository.loadOrderAfterSalesRequests(orderId);
        setAccessError(undefined);
        return result;
      } catch (err) {
        if (isAuthorizationError(err)) {
          setAccessError(
            err instanceof Error ? err.message : "请先登录后继续操作"
          );
          openLoginModal();
          return "auth_required" as const;
        }
        throw err;
      }
    },
    [openLoginModal, requireLoggedInAccess, user]
  );

  const createOrderAfterSalesRequest = useCallback(
    async (
      orderId: string,
      request: OrderAfterSalesCreateRequest
    ): Promise<OrderAfterSalesMutationResult | "auth_required"> => {
      if (!user) return requireLoggedInAccess();

      try {
        const result =
          await httpCourseAccessRepository.createOrderAfterSalesRequest(
            orderId,
            request
          );
        setAccessError(undefined);
        return result;
      } catch (err) {
        if (isAuthorizationError(err)) {
          setAccessError(
            err instanceof Error ? err.message : "请先登录后继续操作"
          );
          openLoginModal();
          return "auth_required" as const;
        }
        throw err;
      }
    },
    [openLoginModal, requireLoggedInAccess, user]
  );

  const purchaseCourse = useCallback(
    async (course: Course) => {
      const created = await createCheckoutOrder(course, "course");
      if (created === "auth_required") return created;

      const paid = await payCheckoutOrder(created.checkout.order.id, "manual");
      if (paid === "auth_required") return paid;
      return paid.syncMode;
    },
    [createCheckoutOrder, payCheckoutOrder]
  );

  const activateMembership = useCallback(() => {
    if (!user) return Promise.resolve(requireLoggedInAccess());

    setIsSyncing(true);
    return httpCourseAccessRepository
      .activateMembership(accessUserId)
      .then(remoteState => {
        setState(persist(remoteState));
        setAccessError(undefined);
        return "api" as const;
      })
      .catch(err => {
        if (!shouldUseLocalFallback(err)) {
          setAccessError(
            err instanceof Error ? err.message : "请先登录后继续操作"
          );
          openLoginModal();
          return "auth_required" as const;
        }

        setState(prev => persist(activateCourseMembership(prev)));
        setAccessError(
          err instanceof Error ? err.message : "课程权益服务暂时不可用"
        );
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
    createCheckoutOrder,
    createMembershipCheckoutOrder,
    payCheckoutOrder,
    cancelCheckoutOrder,
    createOrderAfterSalesRequest,
    purchaseCourse,
    loadOrderAfterSalesRequests,
    activateMembership,
  };
}
