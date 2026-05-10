import { useEffect, useMemo, useState } from "react";
import type { CounselingAppointmentRecord } from "@shared/domain";
import {
  httpCounselingRepository,
  type CounselingAppointmentUpdateInput,
} from "../api/httpCounselingRepository";

export function useCounselingAppointments(enabled = true) {
  const [appointments, setAppointments] = useState<
    CounselingAppointmentRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<
    string | undefined
  >();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!enabled) {
      setAppointments([]);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    httpCounselingRepository
      .loadAppointments()
      .then(result => {
        if (!mounted) return;
        setAppointments(result.appointments);
        setError(undefined);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "咨询预约暂时不可用");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [enabled]);

  const updateAppointment = async (
    appointmentId: string,
    action: CounselingAppointmentUpdateInput
  ) => {
    setUpdatingAppointmentId(appointmentId);
    try {
      const result = await httpCounselingRepository.updateAppointment(
        appointmentId,
        action
      );
      setAppointments(prev =>
        prev.map(record =>
          record.appointment.id === appointmentId
            ? {
                appointment: result.appointment,
                counselor: result.counselor,
                slot: result.slot,
                riskEvent: result.riskEvent,
              }
            : record
        )
      );
      setError(undefined);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "咨询预约状态暂时无法更新");
      return undefined;
    } finally {
      setUpdatingAppointmentId(undefined);
    }
  };

  const pendingCount = useMemo(
    () =>
      appointments.filter(
        record => record.appointment.status === "pending_payment"
      ).length,
    [appointments]
  );

  const upcomingCount = useMemo(
    () =>
      appointments.filter(record =>
        ["pending_payment", "scheduled"].includes(record.appointment.status)
      ).length,
    [appointments]
  );

  return {
    appointments,
    pendingCount,
    upcomingCount,
    isLoading,
    updatingAppointmentId,
    error,
    updateAppointment,
  };
}
