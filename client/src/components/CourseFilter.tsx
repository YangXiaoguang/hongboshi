/*
 * CourseFilter - 课程筛选区
 * 「知性蓝调」设计: 横向胶囊标签，选中态为天空蓝
 * 包含: 学科领域筛选 + 授课类型筛选，支持展开/收起
 */

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { categories, courseTypes } from "@/lib/mockData";

interface CourseFilterProps {
  selectedCategory: string;
  selectedType: string;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string) => void;
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
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
      {/* Subject filter */}
      <div className="px-5 py-4 border-b border-gray-50">
        <div className="flex items-start gap-4">
          <span className="text-sm font-medium text-gray-500 shrink-0 pt-1 w-[72px]">
            学科领域：
          </span>
          <div className="flex flex-wrap gap-2 flex-1">
            {visibleCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3.5 py-1.5 rounded-full text-sm transition-all duration-200 border ${
                  selectedCategory === cat
                    ? "text-white border-transparent font-medium shadow-sm"
                    : "text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 bg-white"
                }`}
                style={
                  selectedCategory === cat
                    ? { backgroundColor: "#4A90D9", borderColor: "#4A90D9" }
                    : {}
                }
              >
                {cat}
              </button>
            ))}
          </div>
          {categories.length > 9 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-blue-500 shrink-0 pt-1 transition-colors"
            >
              {expanded ? (
                <>
                  收起 <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  展开 <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Type filter */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-500 shrink-0 w-[72px]">
            授课类型：
          </span>
          <div className="flex flex-wrap gap-2">
            {courseTypes.map((type) => (
              <button
                key={type}
                onClick={() => onTypeChange(type)}
                className={`px-3.5 py-1.5 rounded-full text-sm transition-all duration-200 border ${
                  selectedType === type
                    ? "text-white border-transparent font-medium shadow-sm"
                    : "text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 bg-white"
                }`}
                style={
                  selectedType === type
                    ? { backgroundColor: "#4A90D9", borderColor: "#4A90D9" }
                    : {}
                }
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
