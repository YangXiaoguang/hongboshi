import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CourseDetailSchema,
  type Course,
  type CourseDetail,
} from "@shared/domain";
import { httpCourseRepository } from "../api/httpCourseRepository";
import { mockCourseRepository } from "../api/mockCourseRepository";
import { buildCourseDetail, getRelatedCourses } from "../model/courseDetail";

function buildDetailFromCourse(course: Course | undefined): CourseDetail | undefined {
  if (!course) return undefined;
  return CourseDetailSchema.parse(buildCourseDetail(course));
}

function getFallbackDetail(courseId: number) {
  return {
    course: mockCourseRepository.getCourseDetailById(courseId),
    relatedCourses: mockCourseRepository.listRelatedCourses(courseId, 3),
  };
}

export function useCourseDetail(courseId: number | undefined) {
  const validCourseId = Number.isInteger(courseId) ? courseId : undefined;
  const fallback = useMemo(() => {
    if (!validCourseId) {
      return {
        course: undefined,
        relatedCourses: [],
      };
    }
    return getFallbackDetail(validCourseId);
  }, [validCourseId]);

  const [course, setCourse] = useState<CourseDetail | undefined>(fallback.course);
  const [relatedCourses, setRelatedCourses] = useState<Course[]>(fallback.relatedCourses);
  const [isLoading, setIsLoading] = useState(Boolean(validCourseId));
  const [error, setError] = useState<string | undefined>();
  const [dataSource, setDataSource] = useState<"api" | "fallback">("fallback");

  useEffect(() => {
    setCourse(fallback.course);
    setRelatedCourses(fallback.relatedCourses);
    setDataSource("fallback");
  }, [fallback.course, fallback.relatedCourses]);

  const loadCourseDetail = useCallback(async () => {
    if (!validCourseId) return;

    setIsLoading(true);
    try {
      const [remoteCourse, remoteCourses] = await Promise.all([
        httpCourseRepository.getCourseById(validCourseId),
        httpCourseRepository.listAllCourses(),
      ]);

      const detail = buildDetailFromCourse(remoteCourse);
      setCourse(detail);
      setRelatedCourses(
        detail ? getRelatedCourses(remoteCourses, detail, 3) : []
      );
      setDataSource("api");
      setError(undefined);
    } catch (err) {
      const nextFallback = getFallbackDetail(validCourseId);
      setCourse(nextFallback.course);
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
    relatedCourses,
    dataSource,
    isLoading,
    error,
    refreshCourseDetail: loadCourseDetail,
  };
}
