import { z } from "zod";
import { ApiResponseSchema, type ApiError } from "@shared/domain";

const CourseAssetErrorResponseSchema = ApiResponseSchema(z.unknown());

export class CourseAssetDownloadError extends Error {
  constructor(
    message: string,
    readonly code?: ApiError["code"],
    readonly status?: number
  ) {
    super(message);
    this.name = "CourseAssetDownloadError";
  }
}

export function getCourseAssetDownloadUrl(courseId: number, assetId: string) {
  return `/api/courses/${courseId}/assets/${encodeURIComponent(assetId)}/download`;
}

export function getFileNameFromContentDisposition(
  contentDisposition: string | null,
  fallback: string
) {
  if (!contentDisposition) return fallback;

  const encoded = contentDisposition.match(/filename="([^"]+)"/)?.[1];
  if (!encoded) return fallback;

  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export async function readCourseAssetDownloadError(
  response: Response,
  fallback = "课程资料下载失败"
) {
  try {
    const payload = await response.json();
    const parsed = CourseAssetErrorResponseSchema.safeParse(payload);
    if (parsed.success && !parsed.data.ok) {
      return new CourseAssetDownloadError(
        parsed.data.error.message,
        parsed.data.error.code,
        response.status
      );
    }
  } catch {
    // Binary or empty responses use the fallback copy below.
  }

  return new CourseAssetDownloadError(fallback, undefined, response.status);
}

export const httpCourseAssetRepository = {
  async downloadMaterial(input: {
    courseId: number;
    assetId: string;
    fallbackFileName: string;
  }) {
    const response = await fetch(
      getCourseAssetDownloadUrl(input.courseId, input.assetId),
      {
        headers: {
          Accept: "application/octet-stream, application/json",
        },
        cache: "no-store",
        credentials: "same-origin",
      }
    );

    if (!response.ok) {
      throw await readCourseAssetDownloadError(response);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = getFileNameFromContentDisposition(
      response.headers.get("Content-Disposition"),
      input.fallbackFileName
    );
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  },
};
