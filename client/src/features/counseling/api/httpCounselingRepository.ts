import {
  ApiResponseSchema,
  CounselingAppointmentCreateRequestSchema,
  CounselingAppointmentCreateResultSchema,
  CounselingAppointmentListSchema,
  CounselingAvailabilitySchema,
  type CounselingAppointmentCreateRequest,
  type CounselingAppointmentCreateResult,
  type CounselingAppointmentList,
  type CounselingAvailability,
} from "@shared/domain";

const CounselingAvailabilityResponseSchema = ApiResponseSchema(
  CounselingAvailabilitySchema
);
const CounselingAppointmentCreateResponseSchema = ApiResponseSchema(
  CounselingAppointmentCreateResultSchema
);
const CounselingAppointmentListResponseSchema = ApiResponseSchema(
  CounselingAppointmentListSchema
);

const API_BASE = "/api/counseling";

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("咨询服务返回了无法解析的数据");
  }
}

export function parseCounselingAvailabilityResponse(
  payload: unknown
): CounselingAvailability {
  const parsed = CounselingAvailabilityResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCounselingAppointmentCreateResponse(
  payload: unknown
): CounselingAppointmentCreateResult {
  const parsed = CounselingAppointmentCreateResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCounselingAppointmentListResponse(
  payload: unknown
): CounselingAppointmentList {
  const parsed = CounselingAppointmentListResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const parsed = CounselingAppointmentCreateResponseSchema.safeParse(payload);
  if (parsed.success && !parsed.data.ok) return parsed.data.error.message;

  const listParsed = CounselingAppointmentListResponseSchema.safeParse(payload);
  if (listParsed.success && !listParsed.data.ok) {
    return listParsed.data.error.message;
  }

  return fallback;
}

export const httpCounselingRepository = {
  async loadAvailability(): Promise<CounselingAvailability> {
    const response = await fetch(`${API_BASE}/availability`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error("咨询服务暂时不可用");
    return parseCounselingAvailabilityResponse(payload);
  },

  async loadAppointments(): Promise<CounselingAppointmentList> {
    const response = await fetch(`${API_BASE}/appointments`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "咨询预约暂时不可用"));
    }
    return parseCounselingAppointmentListResponse(payload);
  },

  async createAppointment(
    request: CounselingAppointmentCreateRequest
  ): Promise<CounselingAppointmentCreateResult> {
    const body = CounselingAppointmentCreateRequestSchema.parse(request);
    const response = await fetch(`${API_BASE}/appointments`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, "咨询预约暂时无法提交，请稍后再试")
      );
    }
    return parseCounselingAppointmentCreateResponse(payload);
  },
};
