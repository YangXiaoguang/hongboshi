import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AssessmentAnswer,
  AssessmentFlow,
  AssessmentQuestion,
  AssessmentResult,
} from "@shared/domain";
import { httpAssessmentRepository } from "../api/httpAssessmentRepository";

type AnswerValue = AssessmentAnswer["value"];

function hasAnswer(
  question: AssessmentQuestion,
  value: AnswerValue | undefined
) {
  if (!question.required) return true;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== "";
}

export function useQuickAssessment() {
  const [flow, setFlow] = useState<AssessmentFlow>();
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Record<string, AnswerValue>
  >({});
  const [result, setResult] = useState<AssessmentResult>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    httpAssessmentRepository
      .loadQuickAssessmentFlow()
      .then(nextFlow => {
        if (!mounted) return;
        setFlow(nextFlow);
        setError(undefined);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "测评服务暂时不可用");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setAnswer = useCallback((questionId: string, value: AnswerValue) => {
    setAnswersByQuestionId(prev => ({
      ...prev,
      [questionId]: value,
    }));
    setResult(undefined);
  }, []);

  const answers = useMemo(() => {
    return Object.entries(answersByQuestionId).map(([questionId, value]) => ({
      questionId,
      value,
    }));
  }, [answersByQuestionId]);

  const answeredCount = useMemo(() => {
    if (!flow) return 0;
    return flow.questions.filter(question =>
      hasAnswer(question, answersByQuestionId[question.id])
    ).length;
  }, [answersByQuestionId, flow]);

  const isComplete = Boolean(flow && answeredCount === flow.questions.length);

  const submit = useCallback(async () => {
    if (!flow) return undefined;

    const nextAnswers = flow.questions.map(question => ({
      questionId: question.id,
      value: answersByQuestionId[question.id],
    }));

    if (nextAnswers.some(answer => answer.value === undefined)) {
      setError("请先完成所有题目");
      return undefined;
    }

    setIsSubmitting(true);
    try {
      const nextResult = await httpAssessmentRepository.submitQuickAssessment(
        nextAnswers as AssessmentAnswer[]
      );
      setResult(nextResult);
      setError(undefined);
      return nextResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "测评服务暂时不可用");
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  }, [answersByQuestionId, flow]);

  const reset = useCallback(() => {
    setAnswersByQuestionId({});
    setResult(undefined);
    setError(undefined);
  }, []);

  return {
    flow,
    answers,
    answersByQuestionId,
    answeredCount,
    isComplete,
    result,
    isLoading,
    isSubmitting,
    error,
    setAnswer,
    submit,
    reset,
  };
}
