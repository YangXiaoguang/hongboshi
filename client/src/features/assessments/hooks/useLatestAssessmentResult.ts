import { useEffect, useState } from "react";
import type { AssessmentResult } from "@shared/domain";
import { httpAssessmentRepository } from "../api/httpAssessmentRepository";
import {
  loadLatestAssessmentResult as loadLocalLatestAssessmentResult,
  saveLatestAssessmentResult,
} from "../api/localAssessmentSnapshot";

type LatestAssessmentSource = "server" | "local" | "none";

function loadInitialSnapshot() {
  const result = loadLocalLatestAssessmentResult();
  return {
    result,
    source: result ? ("local" as const) : ("none" as const),
  };
}

export function useLatestAssessmentResult(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<{
    result?: AssessmentResult;
    source: LatestAssessmentSource;
  }>(() => loadInitialSnapshot());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    setIsLoading(true);

    httpAssessmentRepository
      .loadLatestAssessmentResult()
      .then(result => {
        if (!mounted) return;

        if (result) {
          saveLatestAssessmentResult(result);
          setSnapshot({ result, source: "server" });
        } else {
          setSnapshot(prev => ({
            result: prev.result,
            source: prev.result ? prev.source : "none",
          }));
        }
        setError(undefined);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "最近测评报告暂时不可用");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [enabled]);

  return {
    result: snapshot.result,
    source: snapshot.source,
    isLoading,
    error,
  };
}
