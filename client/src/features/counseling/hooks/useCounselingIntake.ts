import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CounselingAppointmentCreateRequest,
  CounselingAppointmentCreateResult,
  CounselingChannel,
  CounselingConcernTag,
  CounselingUrgency,
} from "@shared/domain";
import { httpCounselingRepository } from "../api/httpCounselingRepository";

export interface CounselingIntakeDraft {
  counselorId?: string;
  slotId?: string;
  channel?: CounselingChannel;
  concernTags: CounselingConcernTag[];
  urgency: CounselingUrgency;
  assessmentReportId?: string;
  assessmentRiskLevel?: CounselingAppointmentCreateRequest["assessmentRiskLevel"];
  noteForCounselor?: string;
}

const initialDraft: CounselingIntakeDraft = {
  concernTags: ["emotion"],
  urgency: "this_week",
};

export function useCounselingIntake() {
  const [availability, setAvailability] =
    useState<
      Awaited<ReturnType<typeof httpCounselingRepository.loadAvailability>>
    >();
  const [draft, setDraft] = useState<CounselingIntakeDraft>(initialDraft);
  const [result, setResult] = useState<CounselingAppointmentCreateResult>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    httpCounselingRepository
      .loadAvailability()
      .then(nextAvailability => {
        if (!mounted) return;
        setAvailability(nextAvailability);
        const firstCounselor = nextAvailability.counselors[0];
        const firstSlot = nextAvailability.slots.find(slot => slot.available);
        setDraft(prev => ({
          ...prev,
          counselorId: prev.counselorId ?? firstCounselor?.id,
          slotId: prev.slotId ?? firstSlot?.id,
          channel: prev.channel ?? firstSlot?.channel,
        }));
        setError(undefined);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "咨询服务暂时不可用");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedCounselor = useMemo(() => {
    return availability?.counselors.find(
      counselor => counselor.id === draft.counselorId
    );
  }, [availability?.counselors, draft.counselorId]);

  const selectedSlot = useMemo(() => {
    return availability?.slots.find(slot => slot.id === draft.slotId);
  }, [availability?.slots, draft.slotId]);

  const slotsForSelectedCounselor = useMemo(() => {
    if (!draft.counselorId) return [];
    return (
      availability?.slots.filter(
        slot => slot.counselorId === draft.counselorId && slot.available
      ) ?? []
    );
  }, [availability?.slots, draft.counselorId]);

  const updateDraft = useCallback((patch: Partial<CounselingIntakeDraft>) => {
    setDraft(prev => ({
      ...prev,
      ...patch,
    }));
    setResult(undefined);
  }, []);

  const toggleConcernTag = useCallback((tag: CounselingConcernTag) => {
    setDraft(prev => {
      const exists = prev.concernTags.includes(tag);
      const nextTags = exists
        ? prev.concernTags.filter(item => item !== tag)
        : [...prev.concernTags, tag].slice(0, 5);
      return {
        ...prev,
        concernTags: nextTags.length ? nextTags : prev.concernTags,
      };
    });
    setResult(undefined);
  }, []);

  const submit = useCallback(async () => {
    if (!draft.counselorId || !draft.slotId || !draft.channel) {
      setError("请先选择咨询师和咨询时间");
      return undefined;
    }

    setIsSubmitting(true);
    try {
      const nextResult = await httpCounselingRepository.createAppointment({
        counselorId: draft.counselorId,
        slotId: draft.slotId,
        channel: draft.channel,
        concernTags: draft.concernTags,
        urgency: draft.urgency,
        assessmentReportId: draft.assessmentReportId,
        assessmentRiskLevel: draft.assessmentRiskLevel,
        noteForCounselor: draft.noteForCounselor,
      });
      setResult(nextResult);
      setAvailability(prev =>
        prev
          ? {
              ...prev,
              slots: prev.slots.map(slot =>
                slot.id === nextResult.slot.id ? nextResult.slot : slot
              ),
            }
          : prev
      );
      setError(undefined);
      return nextResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "咨询预约暂时无法提交");
      return undefined;
    } finally {
      setIsSubmitting(false);
    }
  }, [draft]);

  return {
    availability,
    draft,
    selectedCounselor,
    selectedSlot,
    slotsForSelectedCounselor,
    result,
    isLoading,
    isSubmitting,
    error,
    updateDraft,
    toggleConcernTag,
    submit,
  };
}
