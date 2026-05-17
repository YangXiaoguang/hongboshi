import { useCallback, useEffect, useState } from "react";
import type {
  CourseMarketingRule,
  CourseMarketingRuleSnapshot,
} from "@shared/domain";
import { httpCourseMarketingRepository } from "../api/httpCourseMarketingRepository";

export function useCourseMarketingRules() {
  const [snapshot, setSnapshot] = useState<CourseMarketingRuleSnapshot>();
  const [rules, setRules] = useState<CourseMarketingRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [dataSource, setDataSource] = useState<"api" | "fallback">("fallback");

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await httpCourseMarketingRepository.loadActiveRules();
      setSnapshot(result);
      setRules(result.rules);
      setDataSource("api");
      setError(undefined);
    } catch (err) {
      setSnapshot(undefined);
      setRules([]);
      setDataSource("fallback");
      setError(err instanceof Error ? err.message : "课程营销服务暂时不可用");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  return {
    dataSource,
    error,
    isLoading,
    refreshMarketingRules: loadRules,
    rules,
    serverTime: snapshot?.serverTime,
  };
}
