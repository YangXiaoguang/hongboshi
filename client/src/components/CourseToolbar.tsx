/*
 * CourseToolbar - 排序与搜索工具栏
 * 「知性蓝调」设计: 排序Tab使用3px蓝色下划线指示器
 * 包含: 排序标签 + 会员课程复选框 + 搜索框
 */

import { useState } from "react";
import { Search } from "lucide-react";
import { sortOptions } from "@/lib/mockData";

interface CourseToolbarProps {
  activeSort: string;
  onSortChange: (sort: string) => void;
  onSearch: (keyword: string) => void;
  vipOnly: boolean;
  onVipToggle: (checked: boolean) => void;
  totalCount: number;
}

export default function CourseToolbar({
  activeSort,
  onSortChange,
  onSearch,
  vipOnly,
  onVipToggle,
  totalCount,
}: CourseToolbarProps) {
  const [searchValue, setSearchValue] = useState("");

  const handleSearch = () => {
    onSearch(searchValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Left: Sort tabs + VIP checkbox */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`relative px-4 py-2 text-sm transition-all duration-200 rounded-md ${
                activeSort === opt.value
                  ? "font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
              style={
                activeSort === opt.value
                  ? { color: "#1B365D" }
                  : {}
              }
            >
              {opt.label}
              {activeSort === opt.value && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full"
                  style={{ backgroundColor: "#4A90D9" }}
                />
              )}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={vipOnly}
            onChange={(e) => onVipToggle(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 accent-blue-500"
          />
          <span>会员课程</span>
        </label>

        <span className="text-xs text-gray-400 hidden sm:inline">
          共 {totalCount} 门课程
        </span>
      </div>

      {/* Right: Search box */}
      <div className="flex items-center w-full sm:w-auto">
        <div className="relative w-full sm:w-[280px]">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入关键词搜索课程"
            className="w-full h-9 pl-4 pr-10 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all placeholder:text-gray-300"
          />
          <button
            onClick={handleSearch}
            className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
