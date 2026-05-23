import type { Dispatch, SetStateAction } from "react";
import { ListFilter, Search } from "lucide-react";
import {
  ALL_COURSE_PRODUCT_STATUS,
  type CourseProductListQuery,
} from "@shared/domain";

export type CourseProductStatusFilter = CourseProductListQuery["status"];
export type CourseProductCategoryFilter = CourseProductListQuery["category"];

export const statusFilters: {
  value: CourseProductStatusFilter;
  label: string;
}[] = [
  { value: ALL_COURSE_PRODUCT_STATUS, label: "全部状态" },
  { value: "published", label: "已上架" },
  { value: "unpublished", label: "已下架" },
  { value: "draft", label: "草稿" },
  { value: "archived", label: "已归档" },
];

export const sortOptions: {
  value: CourseProductListQuery["sort"];
  label: string;
}[] = [
  { value: "updated_desc", label: "最近更新" },
  { value: "created_desc", label: "最新创建" },
  { value: "learners_desc", label: "学习人数" },
  { value: "price_asc", label: "价格从低到高" },
  { value: "price_desc", label: "价格从高到低" },
];

export function CourseProductFilters({
  categories,
  keywordDraft,
  query,
  setQuery,
  onKeywordDraftChange,
}: {
  categories: string[];
  keywordDraft: string;
  query: CourseProductListQuery;
  setQuery: Dispatch<SetStateAction<CourseProductListQuery>>;
  onKeywordDraftChange: (value: string) => void;
}) {
  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        setQuery(current => ({
          ...current,
          keyword: keywordDraft,
          page: 1,
        }));
      }}
      className="grid gap-3 border-b border-[#E8DED0] px-4 py-4 lg:grid-cols-[minmax(240px,1fr)_180px_150px_170px_auto] lg:items-center lg:px-5"
    >
      <label className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8176]" />
        <input
          value={keywordDraft}
          onChange={event => onKeywordDraftChange(event.target.value)}
          placeholder="搜索课程、讲师、分类或 ID"
          className="h-10 w-full rounded-lg border border-[#D8CEC0] bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
        />
      </label>

      <select
        value={query.category}
        onChange={event =>
          setQuery(current => ({
            ...current,
            category: event.target.value as CourseProductCategoryFilter,
            page: 1,
          }))
        }
        className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#41524B] outline-none transition focus:border-[#6F8F83]"
      >
        {categories.map(category => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select
        value={query.status}
        onChange={event =>
          setQuery(current => ({
            ...current,
            status: event.target.value as CourseProductStatusFilter,
            page: 1,
          }))
        }
        className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#41524B] outline-none transition focus:border-[#6F8F83]"
      >
        {statusFilters.map(item => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <select
        value={query.sort}
        onChange={event =>
          setQuery(current => ({
            ...current,
            sort: event.target.value as CourseProductListQuery["sort"],
            page: 1,
          }))
        }
        className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#41524B] outline-none transition focus:border-[#6F8F83]"
      >
        {sortOptions.map(item => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]">
        <ListFilter className="h-4 w-4" />
        筛选
      </button>
    </form>
  );
}
