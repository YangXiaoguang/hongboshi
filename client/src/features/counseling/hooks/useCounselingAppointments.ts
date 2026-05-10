import { useEffect, useMemo, useState } from "react";
import type { CounselingAppointmentRecord } from "@shared/domain";
import { httpCounselingRepository } from "../api/httpCounselingRepository";

export function useCounselingAppointments(enabled = true) {
  const [appointments, setAppointments] = useState<
    CounselingAppointmentRecord[]
  >([]);
  const [isLoading, setIsLoading] = useState(enabled);
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
    error,
  };
}
