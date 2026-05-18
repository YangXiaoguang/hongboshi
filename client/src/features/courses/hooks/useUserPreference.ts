import { useCallback, useEffect, useState } from "react";
import type { UserPreference } from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpUserPreferenceRepository } from "../api/httpUserPreferenceRepository";

export function useUserPreference() {
  const { isLoggedIn } = useAuth();
  const [preference, setPreference] = useState<UserPreference | undefined>();
  const [isPreferenceLoading, setIsPreferenceLoading] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | undefined>();

  const reloadPreference = useCallback(async () => {
    if (!isLoggedIn) {
      setPreference(undefined);
      setPreferenceError(undefined);
      setIsPreferenceLoading(false);
      return undefined;
    }

    setIsPreferenceLoading(true);
    try {
      const nextPreference = await httpUserPreferenceRepository.getMyPreference();
      setPreference(nextPreference);
      setPreferenceError(undefined);
      return nextPreference;
    } catch (err) {
      setPreferenceError(
        err instanceof Error ? err.message : "账号券包暂时无法同步"
      );
      return undefined;
    } finally {
      setIsPreferenceLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    let mounted = true;

    if (!isLoggedIn) {
      setPreference(undefined);
      setPreferenceError(undefined);
      setIsPreferenceLoading(false);
      return;
    }

    setIsPreferenceLoading(true);
    httpUserPreferenceRepository
      .getMyPreference()
      .then(nextPreference => {
        if (!mounted) return;
        setPreference(nextPreference);
        setPreferenceError(undefined);
      })
      .catch(err => {
        if (!mounted) return;
        setPreferenceError(
          err instanceof Error ? err.message : "账号券包暂时无法同步"
        );
      })
      .finally(() => {
        if (mounted) setIsPreferenceLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  return {
    preference,
    couponClaims: preference?.couponClaims ?? [],
    isPreferenceLoading,
    preferenceError,
    reloadPreference,
  };
}
