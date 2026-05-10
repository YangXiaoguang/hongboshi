export * from "./api/httpCounselingRepository";
export * from "./hooks/useCounselingAppointments";
export * from "./hooks/useCounselingIntake";
export type {
  Counselor,
  CounselorSpecialty,
  CounselingAppointmentRecord,
  CounselingAppointmentCreateRequest,
  CounselingAppointmentCreateResult,
  CounselingAppointmentList,
  CounselingAvailability,
  CounselingChannel,
  CounselingConcernTag,
  CounselingSlot,
  CounselingUrgency,
} from "@shared/domain";
