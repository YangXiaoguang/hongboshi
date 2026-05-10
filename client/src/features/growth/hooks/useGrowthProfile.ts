import { useCallback, useEffect, useState } from "react";
import type { GrowthProfile } from "@shared/domain";
import { httpGrowthProfileRepository } from "../api/httpGrowthProfileRepository";

export function useGrowthProfile(enabled = true) {
  const [profile, setProfile] = useState<GrowthProfile | undefined>();
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | undefined>();

  const reload = useCallback(async () => {
    if (!enabled) return undefined;

    setIsLoading(true);
    try {
      const nextProfile = await httpGrowthProfileRepository.load();
      setProfile(nextProfile);
      setError(undefined);
      return nextProfile;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "成长档案服务暂时不可用"
      );
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    let mounted = true;

    if (!enabled) {
      setProfile(undefined);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    setIsLoading(true);
    httpGrowthProfileRepository
      .load()
      .then(nextProfile => {
        if (!mounted) return;
        setProfile(nextProfile);
        setError(undefined);
      })
      .catch(err => {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "成长档案服务暂时不可用"
        );
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [enabled]);

  return {
    profile,
    isLoading,
    error,
    reload,
  };
}
