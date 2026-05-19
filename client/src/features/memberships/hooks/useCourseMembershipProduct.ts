import { useCallback, useEffect, useMemo, useState } from "react";
import {
  COURSE_MEMBERSHIP_PRODUCT_CONTRACT_VERSION,
  defaultCourseMembershipProduct,
  getPrimaryCourseMembershipPlan,
  type CourseMembershipProductSnapshot,
} from "@shared/domain";
import { httpCourseMembershipProductRepository } from "../api/httpCourseMembershipProductRepository";

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

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const remoteSnapshot =
        await httpCourseMembershipProductRepository.loadPublicSnapshot();
      setSnapshot(remoteSnapshot);
      setError(undefined);
      setIsFallback(false);
    } catch (err) {
      setSnapshot(createFallbackSnapshot());
      setError(err instanceof Error ? err.message : "会员商品暂时不可用");
      setIsFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      })
      .catch(err => {
        if (!mounted) return;
        setSnapshot(createFallbackSnapshot());
        setError(err instanceof Error ? err.message : "会员商品暂时不可用");
        setIsFallback(true);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const primaryPlan = useMemo(
    () => getPrimaryCourseMembershipPlan(snapshot.product),
    [snapshot.product]
  );

  return {
    snapshot,
    product: snapshot.product,
    primaryPlan,
    isLoading,
    isFallback,
    error,
    reload: load,
  };
}
