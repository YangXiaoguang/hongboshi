/*
 * Home / CourseDiscovery - 课程发现页面主容器
 * 「知性蓝调」设计: 严格12列网格，信息从上到下自然流动
 * 整合: Header → Filter → Toolbar → CardGrid → Pagination → Footer
 * 新增: 收藏状态管理
 */

import { useState, useMemo, useCallback } from "react";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import CourseFilter from "@/components/CourseFilter";
import CourseToolbar from "@/components/CourseToolbar";
import CourseCard from "@/components/CourseCard";
import MobileView from "@/components/MobileView";
import { courses, PAGE_SIZE } from "@/lib/mockData";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Smartphone,
  Monitor,
} from "lucide-react";

export default function Home() {
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [selectedType, setSelectedType] = useState("全部");
  const [activeSort, setActiveSort] = useState("comprehensive");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"pc" | "mobile">("pc");

  // Favorites state
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const handleToggleFavorite = useCallback((courseId: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }, []);

  // Filter and sort courses
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // Category filter
    if (selectedCategory !== "全部") {
      result = result.filter((c) => c.category === selectedCategory);
    }

    // Type filter
    if (selectedType !== "全部") {
      result = result.filter((c) => c.type === selectedType);
    }

    // VIP filter
    if (vipOnly) {
      result = result.filter((c) => c.isVip);
    }

    // Search filter
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(kw) ||
          c.teacher.toLowerCase().includes(kw) ||
          c.category.toLowerCase().includes(kw)
      );
    }

    // Sort
    switch (activeSort) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "hottest":
        result.sort((a, b) => b.learners - a.learners);
        break;
      case "price":
        result.sort((a, b) => a.price - b.price);
        break;
      default:
        // comprehensive - keep original order
        break;
    }

    return result;
  }, [selectedCategory, selectedType, activeSort, searchKeyword, vipOnly]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCourses.slice(start, start + PAGE_SIZE);
  }, [filteredCourses, currentPage]);

  // Reset page on filter change
  const handleCategoryChange = useCallback((cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((sort: string) => {
    setActiveSort(sort);
    setCurrentPage(1);
  }, []);

  const handleSearch = useCallback((kw: string) => {
    setSearchKeyword(kw);
    setCurrentPage(1);
  }, []);

  const handleVipToggle = useCallback((checked: boolean) => {
    setVipOnly(checked);
    setCurrentPage(1);
  }, []);

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  // If mobile view mode
  if (viewMode === "mobile") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        {/* View mode toggle */}
        <div className="max-w-[1200px] mx-auto w-full px-4 lg:px-6 pt-4 flex justify-end">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => setViewMode("pc")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Monitor className="w-3.5 h-3.5" />
              PC端
            </button>
            <button
              onClick={() => setViewMode("mobile")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white font-medium transition-colors"
              style={{ backgroundColor: "#4A90D9" }}
            >
              <Smartphone className="w-3.5 h-3.5" />
              小程序端
            </button>
          </div>
        </div>

        {/* Mobile preview container */}
        <div className="flex-1 flex items-start justify-center py-8 px-4">
          <div className="relative">
            {/* Phone frame */}
            <div
              className="w-[375px] h-[812px] rounded-[40px] border-[8px] overflow-hidden shadow-2xl"
              style={{ borderColor: "#1B365D" }}
            >
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-black rounded-b-2xl z-10" />
              {/* Content */}
              <div className="w-full h-full overflow-y-auto bg-gray-50">
                <MobileView
                  courses={filteredCourses}
                  selectedCategory={selectedCategory}
                  selectedType={selectedType}
                  onCategoryChange={handleCategoryChange}
                  onTypeChange={handleTypeChange}
                  favorites={favorites}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            </div>
          </div>
        </div>

        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-5">
          {/* View mode toggle */}
          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
              <button
                onClick={() => setViewMode("pc")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white font-medium transition-colors"
                style={{ backgroundColor: "#4A90D9" }}
              >
                <Monitor className="w-3.5 h-3.5" />
                PC端
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5" />
                小程序端
              </button>
            </div>
          </div>

          {/* Filter section */}
          <CourseFilter
            selectedCategory={selectedCategory}
            selectedType={selectedType}
            onCategoryChange={handleCategoryChange}
            onTypeChange={handleTypeChange}
          />

          {/* Toolbar section */}
          <div className="mt-5">
            <CourseToolbar
              activeSort={activeSort}
              onSortChange={handleSortChange}
              onSearch={handleSearch}
              vipOnly={vipOnly}
              onVipToggle={handleVipToggle}
              totalCount={filteredCourses.length}
            />
          </div>

          {/* Course grid */}
          <div className="mt-5">
            {paginatedCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {paginatedCourses.map((course, i) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    index={i}
                    isFavorited={favorites.has(course.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="text-gray-300 text-5xl mb-4">📚</div>
                <p className="text-gray-400 text-sm">
                  暂无匹配的课程，请尝试调整筛选条件
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 mb-4 flex items-center justify-center gap-1">
              {/* First page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev */}
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              {getPageNumbers().map((page, i) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="w-8 h-8 flex items-center justify-center text-sm text-gray-300"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-all duration-200 ${
                      currentPage === page
                        ? "text-white font-medium shadow-sm"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                    style={
                      currentPage === page
                        ? { backgroundColor: "#4A90D9" }
                        : {}
                    }
                  >
                    {page}
                  </button>
                )
              )}

              {/* Next */}
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      <AppFooter />

      {/* Fade-in-up animation keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
