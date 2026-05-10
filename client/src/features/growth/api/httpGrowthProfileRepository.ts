import {
  ApiResponseSchema,
  GrowthProfileSchema,
  type GrowthProfile,
} from "@shared/domain";

const GrowthProfileResponseSchema = ApiResponseSchema(GrowthProfileSchema);

export class GrowthProfileRequestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "GrowthProfileRequestError";
  }
}

export function parseGrowthProfileResponse(payload: unknown): GrowthProfile {
  const parsed = GrowthProfileResponseSchema.parse(payload);
  if (!parsed.ok) {
    throw new GrowthProfileRequestError(
      parsed.error.message,
      parsed.error.code
    );
  }
  return parsed.data;
}

function toRequestError(err: unknown, status?: number) {
  if (err instanceof GrowthProfileRequestError) {
    return new GrowthProfileRequestError(err.message, err.code, status);
  }
  return new GrowthProfileRequestError("成长档案服务暂时不可用", undefined, status);
}

export const httpGrowthProfileRepository = {
  async load(): Promise<GrowthProfile> {
    const response = await fetch("/api/growth/profile", {
      credentials: "include",
    });
    const payload = await response.json().catch(() => undefined);

    try {
      const profile = parseGrowthProfileResponse(payload);
      if (!response.ok) {
        throw new GrowthProfileRequestError(
          "成长档案服务暂时不可用",
          undefined,
          response.status
        );
      }
      return profile;
    } catch (err) {
      throw toRequestError(err, response.status);
    }
  },
};
