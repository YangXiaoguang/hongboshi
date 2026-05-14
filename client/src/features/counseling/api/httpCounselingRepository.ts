import {
  ApiResponseSchema,
  CounselingAppointmentActionRequestSchema,
  CounselingAppointmentActionResultSchema,
  CounselingAdminScheduleActionRequestSchema,
  CounselingAdminScheduleConsoleSchema,
  CounselingAdminScheduleMutationResultSchema,
  CounselingAppointmentCreateRequestSchema,
  CounselingAppointmentCreateResultSchema,
  CounselingAppointmentListSchema,
  CounselingAvailabilitySchema,
  CounselingCancellationPolicyUpdateRequestSchema,
  CounselingCancellationPolicyUpdateResultSchema,
  CounselingOperationsConsoleSchema,
  CounselingWorkbenchSchema,
  type CounselingAppointmentAction,
  type CounselingAppointmentActionRequest,
  type CounselingAppointmentActionResult,
  type CounselingAdminScheduleActionRequest,
  type CounselingAdminScheduleConsole,
  type CounselingAdminScheduleMutationResult,
  type CounselingAppointmentCreateRequest,
  type CounselingAppointmentCreateResult,
  type CounselingAppointmentList,
  type CounselingAvailability,
  type CounselingCancellationPolicyUpdateRequest,
  type CounselingCancellationPolicyUpdateResult,
  type CounselingOperationsConsole,
  type CounselingWorkbench,
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
const CounselingWorkbenchResponseSchema = ApiResponseSchema(
  CounselingWorkbenchSchema
);
const CounselingOperationsConsoleResponseSchema = ApiResponseSchema(
  CounselingOperationsConsoleSchema
);
const CounselingAdminScheduleConsoleResponseSchema = ApiResponseSchema(
  CounselingAdminScheduleConsoleSchema
);
const CounselingAdminScheduleMutationResponseSchema = ApiResponseSchema(
  CounselingAdminScheduleMutationResultSchema
);
const CounselingCancellationPolicyUpdateResponseSchema = ApiResponseSchema(
  CounselingCancellationPolicyUpdateResultSchema
);
const CounselingAppointmentActionResponseSchema = ApiResponseSchema(
  CounselingAppointmentActionResultSchema
);

export type CounselingAppointmentUpdateInput =
  | Extract<CounselingAppointmentAction, "confirm_payment" | "cancel">
  | Extract<CounselingAppointmentActionRequest, { action: "reschedule" }>;

export type CounselingAppointmentFulfillmentInput = Extract<
  CounselingAppointmentActionRequest,
  { action: "complete_session" | "mark_no_show" }
>;

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

export function parseCounselingWorkbenchResponse(
  payload: unknown
): CounselingWorkbench {
  const parsed = CounselingWorkbenchResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCounselingOperationsConsoleResponse(
  payload: unknown
): CounselingOperationsConsole {
  const parsed = CounselingOperationsConsoleResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCounselingAdminScheduleConsoleResponse(
  payload: unknown
): CounselingAdminScheduleConsole {
  const parsed = CounselingAdminScheduleConsoleResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCounselingAdminScheduleMutationResponse(
  payload: unknown
): CounselingAdminScheduleMutationResult {
  const parsed = CounselingAdminScheduleMutationResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCounselingCancellationPolicyUpdateResponse(
  payload: unknown
): CounselingCancellationPolicyUpdateResult {
  const parsed =
    CounselingCancellationPolicyUpdateResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

export function parseCounselingAppointmentActionResponse(
  payload: unknown
): CounselingAppointmentActionResult {
  const parsed = CounselingAppointmentActionResponseSchema.parse(payload);
  if (!parsed.ok) throw new Error(parsed.error.message);
  return parsed.data;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const parsed = CounselingAppointmentCreateResponseSchema.safeParse(payload);
  if (parsed.success && !parsed.data.ok) return parsed.data.error.message;

  const actionParsed =
    CounselingAppointmentActionResponseSchema.safeParse(payload);
  if (actionParsed.success && !actionParsed.data.ok) {
    return actionParsed.data.error.message;
  }

  const listParsed = CounselingAppointmentListResponseSchema.safeParse(payload);
  if (listParsed.success && !listParsed.data.ok) {
    return listParsed.data.error.message;
  }

  const workbenchParsed = CounselingWorkbenchResponseSchema.safeParse(payload);
  if (workbenchParsed.success && !workbenchParsed.data.ok) {
    return workbenchParsed.data.error.message;
  }

  const operationsParsed =
    CounselingOperationsConsoleResponseSchema.safeParse(payload);
  if (operationsParsed.success && !operationsParsed.data.ok) {
    return operationsParsed.data.error.message;
  }

  const scheduleParsed =
    CounselingAdminScheduleConsoleResponseSchema.safeParse(payload);
  if (scheduleParsed.success && !scheduleParsed.data.ok) {
    return scheduleParsed.data.error.message;
  }

  const scheduleMutationParsed =
    CounselingAdminScheduleMutationResponseSchema.safeParse(payload);
  if (scheduleMutationParsed.success && !scheduleMutationParsed.data.ok) {
    return scheduleMutationParsed.data.error.message;
  }

  const policyParsed =
    CounselingCancellationPolicyUpdateResponseSchema.safeParse(payload);
  if (policyParsed.success && !policyParsed.data.ok) {
    return policyParsed.data.error.message;
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
      credentials: "same-origin",
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
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "咨询预约暂时不可用"));
    }
    return parseCounselingAppointmentListResponse(payload);
  },

  async loadWorkbenchAppointments(): Promise<CounselingWorkbench> {
    const response = await fetch(`${API_BASE}/workbench/appointments`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "咨询师工作台暂时不可用"));
    }
    return parseCounselingWorkbenchResponse(payload);
  },

  async loadOperationsConsole(): Promise<CounselingOperationsConsole> {
    const response = await fetch(`${API_BASE}/admin/operations`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "咨询运营配置暂时不可用"));
    }
    return parseCounselingOperationsConsoleResponse(payload);
  },

  async loadAdminSchedules(): Promise<CounselingAdminScheduleConsole> {
    const response = await fetch(`${API_BASE}/admin/schedules`, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "咨询排班暂时不可用"));
    }
    return parseCounselingAdminScheduleConsoleResponse(payload);
  },

  async updateAdminSchedule(
    request: CounselingAdminScheduleActionRequest
  ): Promise<CounselingAdminScheduleMutationResult> {
    const body = CounselingAdminScheduleActionRequestSchema.parse(request);
    const response = await fetch(`${API_BASE}/admin/schedules`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "咨询排班暂时无法保存"));
    }
    return parseCounselingAdminScheduleMutationResponse(payload);
  },

  async updateCancellationPolicy(
    request: CounselingCancellationPolicyUpdateRequest
  ): Promise<CounselingCancellationPolicyUpdateResult> {
    const body = CounselingCancellationPolicyUpdateRequestSchema.parse(request);
    const response = await fetch(`${API_BASE}/admin/cancellation-policy`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload, "取消规则暂时无法保存"));
    }
    return parseCounselingCancellationPolicyUpdateResponse(payload);
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
      credentials: "same-origin",
    });
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, "咨询预约暂时无法提交，请稍后再试")
      );
    }
    return parseCounselingAppointmentCreateResponse(payload);
  },

  async updateAppointment(
    appointmentId: string,
    action: CounselingAppointmentUpdateInput
  ): Promise<CounselingAppointmentActionResult> {
    const body = CounselingAppointmentActionRequestSchema.parse(
      typeof action === "string" ? { action } : action
    );
    const response = await fetch(
      `${API_BASE}/appointments/${encodeURIComponent(appointmentId)}/actions`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: "same-origin",
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, "咨询预约状态暂时无法更新，请稍后再试")
      );
    }
    return parseCounselingAppointmentActionResponse(payload);
  },

  async fulfillAppointment(
    appointmentId: string,
    action: CounselingAppointmentFulfillmentInput
  ): Promise<CounselingAppointmentActionResult> {
    const body = CounselingAppointmentActionRequestSchema.parse(action);
    const response = await fetch(
      `${API_BASE}/appointments/${encodeURIComponent(appointmentId)}/fulfillment`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: "same-origin",
      }
    );
    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(
        extractErrorMessage(payload, "咨询履约状态暂时无法更新，请稍后再试")
      );
    }
    return parseCounselingAppointmentActionResponse(payload);
  },
};
