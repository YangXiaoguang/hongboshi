import { useCallback, useMemo, useState } from "react";
import type { CourseSort } from "@shared/domain";
import { mockCourseRepository } from "../api/mockCourseRepository";
import {
  ALL_COURSE_CATEGORY,
  ALL_COURSE_TYPE,
  COURSE_PAGE_SIZE,
  getPageNumbers,
  type CourseCategoryFilter,
  type CourseTypeFilter,
} from "../model/courseCatalog";

export function useCourseCatalog() {
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

  const catalog = useMemo(() => mockCourseRepository.listCourses(query), [query]);

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
    setCategory,
    setType,
    setSort,
    setKeyword,
    setVipOnlyFilter,
    setCurrentPage,
  };
}
