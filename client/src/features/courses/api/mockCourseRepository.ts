import { courses as mockCourses } from "@/lib/mockData";
import {
  CourseDetailSchema,
  CourseSchema,
  type Course,
  type CourseDetail,
} from "@shared/domain";
import { buildCourseDetail, getRelatedCourses } from "../model/courseDetail";
import {
  getRecommendedCourses,
  listCoursesByQuery,
  type CourseCatalogQuery,
  type CourseCatalogResult,
  type CourseCategoryFilter,
} from "../model/courseCatalog";

export interface CourseRepository {
  listAllCourses(): Course[];
  listCourses(query: CourseCatalogQuery): CourseCatalogResult;
  listRecommendedCourses(category: CourseCategoryFilter, limit?: number): Course[];
  getCourseById(courseId: number): Course | undefined;
  getCourseDetailById(courseId: number): CourseDetail | undefined;
  listRelatedCourses(courseId: number, limit?: number): Course[];
}

function getValidatedMockCourses(): Course[] {
  return mockCourses.map((course) => CourseSchema.parse(course));
}

export const mockCourseRepository: CourseRepository = {
  listAllCourses() {
    return getValidatedMockCourses();
  },
  listCourses(query) {
    return listCoursesByQuery(getValidatedMockCourses(), query);
  },
  listRecommendedCourses(category, limit) {
    return getRecommendedCourses(getValidatedMockCourses(), category, limit);
  },
  getCourseById(courseId) {
    return getValidatedMockCourses().find((course) => course.id === courseId);
  },
  getCourseDetailById(courseId) {
    const course = getValidatedMockCourses().find((item) => item.id === courseId);
    if (!course) return undefined;
    return CourseDetailSchema.parse(buildCourseDetail(course));
  },
  listRelatedCourses(courseId, limit) {
    const courses = getValidatedMockCourses();
    const course = courses.find((item) => item.id === courseId);
    if (!course) return [];
    return getRelatedCourses(courses, course, limit);
  },
};
