import { courses as mockCourses } from "@/lib/mockData";
import { CourseSchema, type Course } from "@shared/domain";
import {
  getRecommendedCourses,
  listCoursesByQuery,
  type CourseCatalogQuery,
  type CourseCatalogResult,
  type CourseCategoryFilter,
} from "../model/courseCatalog";

export interface CourseRepository {
  listCourses(query: CourseCatalogQuery): CourseCatalogResult;
  listRecommendedCourses(category: CourseCategoryFilter, limit?: number): Course[];
  getCourseById(courseId: number): Course | undefined;
}

function getValidatedMockCourses(): Course[] {
  return mockCourses.map((course) => CourseSchema.parse(course));
}

export const mockCourseRepository: CourseRepository = {
  listCourses(query) {
    return listCoursesByQuery(getValidatedMockCourses(), query);
  },
  listRecommendedCourses(category, limit) {
    return getRecommendedCourses(getValidatedMockCourses(), category, limit);
  },
  getCourseById(courseId) {
    return getValidatedMockCourses().find((course) => course.id === courseId);
  },
};
