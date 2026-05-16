import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
} from "lucide-react";
import CourseCard from "@/components/CourseCard";
import CourseFilter from "@/components/CourseFilter";
import CourseToolbar from "@/components/CourseToolbar";
import type {
  Course,
  CourseAccessStatus,
  CourseCategoryFilter,
  CourseSort,
  CourseTypeFilter,
} from "@/features/courses";

type CoursePageNumber = number | string;

interface CourseDiscoverySectionProps {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  actionSlot?: ReactNode;
  className?: string;
  favoriteCount: number;
  ownedCourseCount: number;
  hasActiveMembership: boolean;
  selectedCategory: CourseCategoryFilter;
  selectedType: CourseTypeFilter;
  activeSort: CourseSort;
  vipOnly: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageNumbers: CoursePageNumber[];
  paginatedCourses: Course[];
  favoriteCourseIds: Set<number>;
  getCourseAccessStatus: (course: Course) => CourseAccessStatus | undefined;
  getCoursePrimaryAction?: (course: Course) => {
    label: string;
    description: string;
    tone: "buy" | "learn" | "member";
  };
  onToggleFavorite: (courseId: number) => void;
  onCoursePrimaryAction?: (course: Course) => void;
  onCategoryChange: (category: CourseCategoryFilter) => void;
  onTypeChange: (type: CourseTypeFilter) => void;
  onSortChange: (sort: CourseSort) => void;
  onSearch: (keyword: string) => void;
  onVipToggle: (checked: boolean) => void;
  onPageChange: (page: number) => void;
}

export default function CourseDiscoverySection({
  id = "courses",
  eyebrow = "课程学习中心",
  title = "先找到一门真正适合你的心理课",
  description = "按困扰、主题和学习形式筛选课程，让成长从可以完成的一小步开始。",
  actionSlot,
  className = "bg-[#F3EDE4]",
  favoriteCount,
  ownedCourseCount,
  hasActiveMembership,
  selectedCategory,
  selectedType,
  activeSort,
  vipOnly,
  currentPage,
  totalPages,
  totalCount,
  pageNumbers,
  paginatedCourses,
  favoriteCourseIds,
  getCourseAccessStatus,
  getCoursePrimaryAction,
  onToggleFavorite,
  onCoursePrimaryAction,
  onCategoryChange,
  onTypeChange,
  onSortChange,
  onSearch,
  onVipToggle,
  onPageChange,
}: CourseDiscoverySectionProps) {
  return (
    <section id={id} className={`${className} px-5 py-16 sm:px-8 lg:px-12`}>
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full bg-[#DDE8D9] px-4 py-2 text-xs font-semibold text-[#41675A]">
              <Sparkles className="mr-2 h-4 w-4" />
              {eyebrow}
            </div>
            <h2 className="mt-4 max-w-[760px] text-3xl font-semibold leading-tight text-[#243B35] sm:text-4xl">
              {title}
            </h2>
            <p className="mt-3 max-w-[650px] text-sm leading-7 text-[#6D746F]">
              {description}
            </p>
            {favoriteCount > 0 && (
              <p className="mt-3 inline-flex rounded-full bg-[#FFFDF8]/80 px-4 py-2 text-xs font-semibold text-[#8C6E4A]">
                已收藏 {favoriteCount} 门课程
              </p>
            )}
            {(ownedCourseCount > 0 || hasActiveMembership) && (
              <p className="ml-0 mt-3 inline-flex rounded-full bg-[#DDE8D9] px-4 py-2 text-xs font-semibold text-[#41675A] sm:ml-2">
                {hasActiveMembership
                  ? "成长会员权益已生效"
                  : `已解锁 ${ownedCourseCount} 门课程`}
              </p>
            )}
          </div>
          {actionSlot}
        </div>

        <CourseFilter
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          onCategoryChange={onCategoryChange}
          onTypeChange={onTypeChange}
        />

        <div className="mt-6">
          <CourseToolbar
            activeSort={activeSort}
            onSortChange={onSortChange}
            onSearch={onSearch}
            vipOnly={vipOnly}
            onVipToggle={onVipToggle}
            totalCount={totalCount}
          />
        </div>

        <div className="mt-8">
          {paginatedCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedCourses.map((course, i) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  index={i}
                  isFavorited={favoriteCourseIds.has(course.id)}
                  accessStatus={getCourseAccessStatus(course)}
                  primaryAction={getCoursePrimaryAction?.(course)}
                  onToggleFavorite={onToggleFavorite}
                  onPrimaryAction={onCoursePrimaryAction}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-sm text-[#7B817C]">
                暂无匹配的课程，请尝试调整筛选条件
              </p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-1">
            <PageButton
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              icon={<ChevronsLeft className="h-4 w-4" />}
            />
            <PageButton
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              icon={<ChevronLeft className="h-4 w-4" />}
            />

            {pageNumbers.map((page, i) =>
              typeof page === "string" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="flex h-9 w-9 items-center justify-center text-sm text-[#9AA19B]"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${
                    currentPage === page
                      ? "bg-[#6F8F83] font-semibold text-white"
                      : "text-[#6D746F] hover:bg-white/70"
                  }`}
                >
                  {page}
                </button>
              )
            )}

            <PageButton
              onClick={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              icon={<ChevronRight className="h-4 w-4" />}
            />
            <PageButton
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              icon={<ChevronsRight className="h-4 w-4" />}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function PageButton({
  onClick,
  disabled,
  icon,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[#7B817C] transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {icon}
    </button>
  );
}
