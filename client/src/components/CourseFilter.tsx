import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  categories,
  courseTypes,
  type CourseCategoryFilter,
  type CourseTypeFilter,
} from "@/features/courses";

interface CourseFilterProps {
  selectedCategory: CourseCategoryFilter;
  selectedType: CourseTypeFilter;
  onCategoryChange: (category: CourseCategoryFilter) => void;
  onTypeChange: (type: CourseTypeFilter) => void;
}

export default function CourseFilter({
  selectedCategory,
  selectedType,
  onCategoryChange,
  onTypeChange,
}: CourseFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleCategories = expanded ? categories : categories.slice(0, 9);

  return (
    <div className="rounded-[28px] border border-[#E1D7C7] bg-[#FFFDF8]/82 p-5 backdrop-blur">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-xs font-semibold text-[#6F8F83]">关注主题</p>
            {categories.length > 9 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B817C] transition hover:text-[#243B35]"
              >
                {expanded ? (
                  <>
                    收起 <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    展开 <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {visibleCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  selectedCategory === cat
                    ? "bg-[#243B35] text-white"
                    : "bg-[#F5EFE6] text-[#66726C] hover:bg-[#E6EDDF] hover:text-[#243B35]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[220px] border-t border-[#E8DED0] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="mb-3 text-xs font-semibold text-[#6F8F83]">学习形式</p>
          <div className="flex flex-wrap gap-2 lg:max-w-[220px]">
            {courseTypes.map((type) => (
              <button
                key={type}
                onClick={() => onTypeChange(type)}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  selectedType === type
                    ? "bg-[#6F8F83] text-white"
                    : "bg-white/80 text-[#66726C] hover:bg-[#E6EDDF] hover:text-[#243B35]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
