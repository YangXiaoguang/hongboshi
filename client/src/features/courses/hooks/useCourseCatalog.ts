import { useCallback, useEffect, useMemo, useState } from "react";
import type { Course, CourseSort } from "@shared/domain";
import { httpCourseRepository } from "../api/httpCourseRepository";
import { mockCourseRepository } from "../api/mockCourseRepository";
import {
  ALL_COURSE_CATEGORY,
  ALL_COURSE_TYPE,
  COURSE_PAGE_SIZE,
  getPageNumbers,
  listCoursesByQuery,
  type CourseCategoryFilter,
  type CourseTypeFilter,
} from "../model/courseCatalog";

export function useCourseCatalog() {
  const [courses, setCourses] = useState<Course[]>(() =>
    mockCourseRepository.listAllCourses()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [dataSource, setDataSource] = useState<"api" | "fallback">("fallback");
  const [selectedCategory, setSelectedCategory] =
    useState<CourseCategoryFilter>(ALL_COURSE_CATEGORY);
  const [selectedType, setSelectedType] = useState<CourseTypeFilter>(ALL_COURSE_TYPE);
  const [activeSort, setActiveSort] = useState<CourseSort>("comprehensive");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const query = useMemo(
    () => ({
      category: selectedCategory,
      type: selectedType,
      sort: activeSort,
      keyword: searchKeyword,
      vipOnly,
      page: currentPage,
      pageSize: COURSE_PAGE_SIZE,
    }),
    [activeSort, currentPage, searchKeyword, selectedCategory, selectedType, vipOnly]
  );

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    try {
      const remoteCourses = await httpCourseRepository.listAllCourses();
      setCourses(remoteCourses);
      setDataSource("api");
      setError(undefined);
    } catch (err) {
      setCourses(mockCourseRepository.listAllCourses());
      setDataSource("fallback");
      setError(err instanceof Error ? err.message : "课程服务暂时不可用");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const catalog = useMemo(() => listCoursesByQuery(courses, query), [courses, query]);

  const setCategory = useCallback((category: CourseCategoryFilter) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  }, []);

  const setType = useCallback((type: CourseTypeFilter) => {
    setSelectedType(type);
    setCurrentPage(1);
  }, []);

  const setSort = useCallback((sort: CourseSort) => {
    setActiveSort(sort);
    setCurrentPage(1);
  }, []);

  const setKeyword = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setCurrentPage(1);
  }, []);

  const setVipOnlyFilter = useCallback((checked: boolean) => {
    setVipOnly(checked);
    setCurrentPage(1);
  }, []);

  return {
    selectedCategory,
    selectedType,
    activeSort,
    searchKeyword,
    vipOnly,
    currentPage: catalog.page,
    totalPages: catalog.totalPages,
    filteredCourses: catalog.items,
    paginatedCourses: catalog.paginatedItems,
    totalCount: catalog.totalCount,
    pageNumbers: getPageNumbers(catalog.totalPages, catalog.page),
    allCourses: courses,
    dataSource,
    isLoading,
    error,
    refreshCourses: loadCourses,
    setCategory,
    setType,
    setSort,
    setKeyword,
    setVipOnlyFilter,
    setCurrentPage,
  };
}
