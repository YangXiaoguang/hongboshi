import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { sortOptions, type CourseSort } from "@/features/courses";

interface CourseToolbarProps {
  activeSort: CourseSort;
  onSortChange: (sort: CourseSort) => void;
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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="inline-flex w-fit rounded-full bg-[#FFFDF8]/76 p-1">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeSort === opt.value
                  ? "bg-[#243B35] text-white"
                  : "text-[#68736D] hover:text-[#243B35]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E1D7C7] bg-white/60 px-4 py-2 text-sm font-medium text-[#68736D]">
          <input
            type="checkbox"
            checked={vipOnly}
            onChange={(e) => onVipToggle(e.target.checked)}
            className="h-4 w-4 rounded border-[#CFC4B3] accent-[#6F8F83]"
          />
          <Sparkles className="h-4 w-4 text-[#8C6E4A]" />
          会员内容
        </label>

        <span className="text-sm text-[#7B817C]">共 {totalCount} 门课程</span>
      </div>

      <div className="relative w-full lg:w-[320px]">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索课程、老师或主题"
          className="h-11 w-full rounded-full border border-[#E1D7C7] bg-[#FFFDF8]/86 pl-4 pr-12 text-sm text-[#243B35] transition placeholder:text-[#A8AAA5] focus:border-[#AFC2AB] focus:outline-none focus:ring-4 focus:ring-[#DDE8D9]/60"
        />
        <button
          onClick={handleSearch}
          className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#6F8F83] text-white transition hover:bg-[#5F7F73]"
          aria-label="搜索"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
