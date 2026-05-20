import { describe, expect, it } from "vitest";
import {
  getCourseAssetDownloadUrl,
  getFileNameFromContentDisposition,
  readCourseAssetDownloadError,
} from "./httpCourseAssetRepository";

describe("http course asset repository", () => {
  it("builds controlled course asset download URLs", () => {
    expect(getCourseAssetDownloadUrl(17, "asset worksheet/1")).toBe(
      "/api/courses/17/assets/asset%20worksheet%2F1/download"
    );
  });

  it("reads file names from content disposition headers", () => {
    expect(
      getFileNameFromContentDisposition(
        'attachment; filename="%E8%AF%BE%E5%90%8E%E7%BB%83%E4%B9%A0.pdf"',
        "material.pdf"
      )
    ).toBe("课后练习.pdf");
  });

  it("keeps API download failure messages for learning feedback", async () => {
    const error = await readCourseAssetDownloadError(
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "请先解锁课程后再下载资料",
          },
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    expect(error.message).toBe("请先解锁课程后再下载资料");
    expect(error.status).toBe(403);
  });
});
