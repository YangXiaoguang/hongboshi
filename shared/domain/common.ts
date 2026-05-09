import { z } from "zod";

export const EntityIdSchema = z.string().min(1);

export const LegacyNumericIdSchema = z.number().int().positive();

export const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const DateTimeLikeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?$/);

export const MoneyAmountSchema = z.number().finite().nonnegative();

export const PaginationQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const PageMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const ApiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "RISK_REVIEW_REQUIRED",
  "INTERNAL_ERROR",
]);

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string().min(1),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export function ApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.discriminatedUnion("ok", [
    z.object({
      ok: z.literal(true),
      data: dataSchema,
    }),
    z.object({
      ok: z.literal(false),
      error: ApiErrorSchema,
    }),
  ]);
}

export function PaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    meta: PageMetaSchema,
  });
}

export type EntityId = z.infer<typeof EntityIdSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type PageMeta = z.infer<typeof PageMetaSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
