import {
  AssessmentResultSchema,
  type AssessmentDimension,
  type AssessmentResult,
} from "@shared/domain";

const STORAGE_KEY = "hongboshi.latest_assessment_result.v1";

export function saveLatestAssessmentResult(result: AssessmentResult) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Ignore storage failures; the report still exists in page state.
  }
}

export function loadLatestAssessmentResult() {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return AssessmentResultSchema.parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function getTopAssessmentDimensions(
  result: AssessmentResult | undefined,
  limit = 3
): AssessmentDimension[] {
  if (!result) return [];

  return (
    Object.entries(result.report.dimensions) as Array<
      [AssessmentDimension, number]
    >
  )
    .filter(([dimension]) => dimension !== "risk")
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([dimension]) => dimension);
}
