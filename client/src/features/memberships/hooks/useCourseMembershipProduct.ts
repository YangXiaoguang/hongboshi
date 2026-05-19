import { useCallback, useEffect, useMemo, useState } from "react";
import {
  COURSE_MEMBERSHIP_PRODUCT_CONTRACT_VERSION,
  defaultCourseMembershipProduct,
  getPrimaryCourseMembershipPlan,
  type CourseMembershipProductSnapshot,
} from "@shared/domain";
import {
  CourseMembershipProductRequestError,
  httpCourseMembershipProductRepository,
} from "../api/httpCourseMembershipProductRepository";

export type CourseMembershipProductAvailability =
  | "available"
  | "fallback"
  | "unavailable";

function createFallbackSnapshot(): CourseMembershipProductSnapshot {
  return {
    version: COURSE_MEMBERSHIP_PRODUCT_CONTRACT_VERSION,
    serverTime: new Date().toISOString(),
    product: defaultCourseMembershipProduct,
  };
}

export function useCourseMembershipProduct() {
  const [snapshot, setSnapshot] = useState<CourseMembershipProductSnapshot>(
    createFallbackSnapshot
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [isFallback, setIsFallback] = useState(true);
  const [availability, setAvailability] =
    useState<CourseMembershipProductAvailability>("fallback");

  const applyLoadFailure = useCallback((err: unknown) => {
    setSnapshot(createFallbackSnapshot());
    setError(err instanceof Error ? err.message : "会员商品暂时不可用");
    setIsFallback(true);
    setAvailability(
      err instanceof CourseMembershipProductRequestError &&
        err.code === "CONFLICT"
        ? "unavailable"
        : "fallback"
    );
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const remoteSnapshot =
        await httpCourseMembershipProductRepository.loadPublicSnapshot();
      setSnapshot(remoteSnapshot);
      setError(undefined);
      setIsFallback(false);
      setAvailability("available");
    } catch (err) {
      applyLoadFailure(err);
    } finally {
      setIsLoading(false);
    }
  }, [applyLoadFailure]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    httpCourseMembershipProductRepository
      .loadPublicSnapshot()
      .then(remoteSnapshot => {
        if (!mounted) return;
        setSnapshot(remoteSnapshot);
        setError(undefined);
        setIsFallback(false);
        setAvailability("available");
      })
      .catch(err => {
        if (!mounted) return;
        applyLoadFailure(err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [applyLoadFailure]);

  const primaryPlan = useMemo(
    () => getPrimaryCourseMembershipPlan(snapshot.product),
    [snapshot.product]
  );
  const isPurchasable =
    availability !== "unavailable" &&
    snapshot.product.status === "active" &&
    primaryPlan.status === "active";

  return {
    snapshot,
    product: snapshot.product,
    primaryPlan,
    availability,
    isPurchasable,
    isLoading,
    isFallback,
    error,
    reload: load,
  };
}
