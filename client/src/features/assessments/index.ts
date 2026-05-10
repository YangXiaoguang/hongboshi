export { httpAssessmentRepository } from "./api/httpAssessmentRepository";
export {
  getTopAssessmentDimensions,
  loadLatestAssessmentResult,
  saveLatestAssessmentResult,
} from "./api/localAssessmentSnapshot";
export { useLatestAssessmentResult } from "./hooks/useLatestAssessmentResult";
export { useQuickAssessment } from "./hooks/useQuickAssessment";
export type {
  AssessmentAnswer,
  AssessmentDimension,
  AssessmentFlow,
  AssessmentQuestion,
  AssessmentReport,
  AssessmentResult,
  AssessmentRiskLevel,
  Recommendation,
} from "@shared/domain";
