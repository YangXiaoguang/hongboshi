import { describe, expect, it } from "vitest";
import { courses } from "../../../shared/data/mockCourses";
import {
  InMemoryCourseProductStore,
  courseProductFromCourse,
} from "../catalog/courseProductStore";
import { InMemoryCourseProductContentStore } from "../catalog/courseProductContentStore";
import {
  getCourseAssetDownloadPayload,
  getCourseAssetViewPayload,
  getCourseDetailContentPayload,
  getCoursePayload,
  listCoursesPayload,
} from "./courseApi";
import {
  InMemoryCourseProductAssetFileStorage,
  InMemoryCourseProductAssetStore,
  updateCourseProductAssetCompliance,
  uploadCourseProductAssetFile,
} from "../catalog/courseProductAssetStore";
import { createEmptyCourseAccessState } from "../../../shared/domain";

describe("course API payloads", () => {
  it("filters and paginates course list payloads", async () => {
    const payload = await listCoursesPayload({
      category: "情绪管理",
      type: "全部",
      sort: "hottest",
      keyword: "",
      vipOnly: false,
      page: 1,
      pageSize: 1,
    });

    expect(payload.ok).toBe(true);
    if (!payload.ok) return;

    expect(payload.data.totalCount).toBeGreaterThan(1);
    expect(payload.data.paginatedItems).toHaveLength(1);
    expect(payload.data.paginatedItems[0].category).toBe("情绪管理");
  });

  it("uses published course products as the public course source", async () => {
    const [first, second] = courses.slice(0, 2).map(courseProductFromCourse);
    const store = new InMemoryCourseProductStore([
      {
        ...first,
        price: {
          ...first.price,
          amount: 88,
          originalAmount: 188,
        },
      },
      { ...second, status: "unpublished" },
      {
        ...second,
        id: "course_product_pending",
        status: "published",
        reviewStatus: "pending",
      },
    ]);

    const listPayload = await listCoursesPayload(
      {
        category: "全部",
        type: "全部",
        sort: "comprehensive",
        keyword: "",
        vipOnly: false,
        page: 1,
        pageSize: 100,
      },
      store
    );
    const detailPayload = await getCoursePayload(first.courseId, store);
    const hiddenDetailPayload = await getCoursePayload(second.courseId, store);

    expect(listPayload.ok).toBe(true);
    if (listPayload.ok) {
      expect(listPayload.data.items.map(course => course.id)).toEqual([
        first.courseId,
      ]);
      expect(listPayload.data.items[0]?.price).toBe(88);
    }

    expect(detailPayload.body.ok).toBe(true);
    if (detailPayload.body.ok) {
      expect(detailPayload.body.data.price).toBe(88);
    }
    expect(hiddenDetailPayload.status).toBe(404);
  });

  it("returns public detail content only for published and approved products", async () => {
    const [first, second] = courses.slice(0, 2).map(courseProductFromCourse);
    const productStore = new InMemoryCourseProductStore([
      first,
      {
        ...second,
        status: "published",
        reviewStatus: "pending",
      },
    ]);
    const contentStore = new InMemoryCourseProductContentStore();

    const contentPayload = await getCourseDetailContentPayload(
      first.courseId,
      productStore,
      contentStore
    );
    const hiddenPayload = await getCourseDetailContentPayload(
      second.courseId,
      productStore,
      contentStore
    );

    expect(contentPayload.status).toBe(200);
    expect(contentPayload.body.ok).toBe(true);
    if (contentPayload.body.ok) {
      expect(contentPayload.body.data.productId).toBe(first.id);
      expect(contentPayload.body.data.chapters.length).toBeGreaterThan(0);
    }
    expect(hiddenPayload.status).toBe(404);
  });

  it("serves image assets publicly and gates downloads by course access", async () => {
    const first = courseProductFromCourse(
      courses.find(course => !course.isFree) ?? courses[0]!
    );
    const productStore = new InMemoryCourseProductStore([first]);
    const assetStore = new InMemoryCourseProductAssetStore();
    const fileStorage = new InMemoryCourseProductAssetFileStorage();

    const image = await uploadCourseProductAssetFile({
      productId: first.id,
      actorId: "operator_1",
      productStore,
      assetStore,
      fileStorage,
      now: "2026-05-20T09:00:00.000Z",
      request: {
        kind: "detail_image",
        title: "详情主视觉",
        fileName: "detail.jpg",
        mimeType: "image/jpeg",
        fileBase64: Buffer.from("image bytes").toString("base64"),
        reason: "上传课程详情主视觉",
      },
    });
    const worksheet = await uploadCourseProductAssetFile({
      productId: first.id,
      actorId: "operator_1",
      productStore,
      assetStore,
      fileStorage,
      now: "2026-05-20T09:01:00.000Z",
      request: {
        kind: "worksheet",
        title: "课后练习表",
        fileName: "worksheet.pdf",
        mimeType: "application/pdf",
        fileBase64: Buffer.from("course worksheet").toString("base64"),
        reason: "上传课程练习资料",
      },
    });

    await updateCourseProductAssetCompliance({
      productId: first.id,
      assetId: image.asset.id,
      actorId: "operator_2",
      productStore,
      assetStore,
      request: {
        complianceStatus: "approved",
        reason: "图片来源和内容已完成合规确认",
      },
    });
    await updateCourseProductAssetCompliance({
      productId: first.id,
      assetId: worksheet.asset.id,
      actorId: "operator_2",
      productStore,
      assetStore,
      request: {
        complianceStatus: "approved",
        reason: "资料来源和内容已完成合规确认",
      },
    });

    const publicView = await getCourseAssetViewPayload(
      first.courseId,
      image.asset.id,
      productStore,
      assetStore,
      fileStorage
    );
    expect(publicView.status).toBe(200);
    if ("file" in publicView) {
      expect(publicView.file.mimeType).toBe("image/jpeg");
      expect(publicView.signedReadUrl.url).toContain(
        encodeURIComponent(image.asset.objectKey ?? image.asset.storageKey!)
      );
    }

    const lockedDownload = await getCourseAssetDownloadPayload(
      first.courseId,
      worksheet.asset.id,
      "user_locked",
      productStore,
      assetStore,
      fileStorage,
      async () => createEmptyCourseAccessState()
    );
    expect(lockedDownload.status).toBe(403);

    const unlockedDownload = await getCourseAssetDownloadPayload(
      first.courseId,
      worksheet.asset.id,
      "user_owned",
      productStore,
      assetStore,
      fileStorage,
      async () => ({
        ...createEmptyCourseAccessState(),
        ownedCourseIds: [first.courseId],
      })
    );

    expect(unlockedDownload.status).toBe(200);
    if ("file" in unlockedDownload) {
      expect(unlockedDownload.file.bytes.toString("utf8")).toBe(
        "course worksheet"
      );
      expect(unlockedDownload.signedReadUrl.expiresAt).toMatch(
        /^20\d{2}-\d{2}-\d{2}T/
      );
    }
  });
});
