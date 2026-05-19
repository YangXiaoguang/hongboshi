import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CourseDetailSchema,
  type Course,
  type CourseDetail,
  type CourseProductDetailContent,
} from "@shared/domain";
import { httpCourseRepository } from "../api/httpCourseRepository";
import { mockCourseRepository } from "../api/mockCourseRepository";
import { buildCourseDetail, getRelatedCourses } from "../model/courseDetail";

function buildDetailFromCourse(
  course: Course | undefined,
  content?: CourseProductDetailContent
): CourseDetail | undefined {
  if (!course) return undefined;
  const detail = buildCourseDetail(course);
  if (!content) return CourseDetailSchema.parse(detail);

  return CourseDetailSchema.parse({
    ...detail,
    summary: content.summary,
    suitableFor: content.targetAudience.map((title, index) => ({
      title,
      description:
        detail.suitableFor[index]?.description ??
        "适合希望用低压力方式开始学习，并把内容带回日常练习的人。",
    })),
    chapters: content.chapters.map((chapter, index) => ({
      id: chapter.id,
      title: chapter.title,
      description:
        chapter.materialPlaceholders.length > 0
          ? `包含${chapter.materialPlaceholders.map(material => material.title).join("、")}等素材。`
          : (detail.chapters[index]?.description ??
            "围绕当前主题完成一组结构化学习和练习。"),
      durationMinutes: chapter.durationMinutes,
      lessonCount: Math.max(1, chapter.materialPlaceholders.length || 1),
    })),
  });
}

function getFallbackDetail(courseId: number) {
  return {
    course: mockCourseRepository.getCourseDetailById(courseId),
    allCourses: mockCourseRepository.listAllCourses(),
    relatedCourses: mockCourseRepository.listRelatedCourses(courseId, 3),
  };
}

export function useCourseDetail(courseId: number | undefined) {
  const validCourseId = Number.isInteger(courseId) ? courseId : undefined;
  const fallback = useMemo(() => {
    if (!validCourseId) {
      return {
        course: undefined,
        allCourses: mockCourseRepository.listAllCourses(),
        relatedCourses: [],
      };
    }
    return getFallbackDetail(validCourseId);
  }, [validCourseId]);

  const [course, setCourse] = useState<CourseDetail | undefined>(
    fallback.course
  );
  const [relatedCourses, setRelatedCourses] = useState<Course[]>(
    fallback.relatedCourses
  );
  const [allCourses, setAllCourses] = useState<Course[]>(fallback.allCourses);
  const [detailContent, setDetailContent] = useState<
    CourseProductDetailContent | undefined
  >();
  const [isLoading, setIsLoading] = useState(Boolean(validCourseId));
  const [error, setError] = useState<string | undefined>();
  const [dataSource, setDataSource] = useState<"api" | "fallback">("fallback");

  useEffect(() => {
    setCourse(fallback.course);
    setAllCourses(fallback.allCourses);
    setRelatedCourses(fallback.relatedCourses);
    setDetailContent(undefined);
    setDataSource("fallback");
  }, [fallback.allCourses, fallback.course, fallback.relatedCourses]);

  const loadCourseDetail = useCallback(async () => {
    if (!validCourseId) return;

    setIsLoading(true);
    try {
      const [remoteCourse, remoteCourses, remoteContent] = await Promise.all([
        httpCourseRepository.getCourseById(validCourseId),
        httpCourseRepository.listAllCourses(),
        httpCourseRepository
          .getCourseDetailContent(validCourseId)
          .catch(() => undefined),
      ]);

      const detail = buildDetailFromCourse(remoteCourse, remoteContent);
      setCourse(detail);
      setDetailContent(remoteContent);
      setAllCourses(remoteCourses);
      setRelatedCourses(
        detail ? getRelatedCourses(remoteCourses, detail, 3) : []
      );
      setDataSource("api");
      setError(undefined);
    } catch (err) {
      const nextFallback = getFallbackDetail(validCourseId);
      setCourse(nextFallback.course);
      setDetailContent(undefined);
      setAllCourses(nextFallback.allCourses);
      setRelatedCourses(nextFallback.relatedCourses);
      setDataSource("fallback");
      setError(err instanceof Error ? err.message : "课程服务暂时不可用");
    } finally {
      setIsLoading(false);
    }
  }, [validCourseId]);

  useEffect(() => {
    void loadCourseDetail();
  }, [loadCourseDetail]);

  return {
    course,
    detailContent,
    allCourses,
    relatedCourses,
    dataSource,
    isLoading,
    error,
    refreshCourseDetail: loadCourseDetail,
  };
}
