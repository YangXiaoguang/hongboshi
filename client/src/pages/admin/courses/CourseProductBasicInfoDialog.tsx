import type { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";
import { Edit3, Loader2, X } from "lucide-react";
import {
  COURSE_CATEGORIES,
  COURSE_TYPES,
  type CourseCategory,
  type CourseProductListItem,
  type CourseType,
} from "@shared/domain";

export type CourseProductBasicInfoFormState = {
  title: string;
  coverUrl: string;
  category: CourseCategory;
  type: CourseType;
  instructorName: string;
  learners: string;
  reason: string;
};

export function CourseProductBasicInfoDialog({
  product,
  form,
  isSubmitting,
  onFormChange,
  onCancel,
  onSubmit,
}: {
  product: CourseProductListItem;
  form: CourseProductBasicInfoFormState;
  isSubmitting: boolean;
  onFormChange: Dispatch<SetStateAction<CourseProductBasicInfoFormState>>;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
      <motion.form
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
        className="max-h-[calc(100vh-48px)] w-full max-w-[680px] overflow-y-auto rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#8A8176]">基础信息</p>
            <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
              {product.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
            aria-label="关闭基础信息"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#41524B]">
            课程标题
            <input
              value={form.title}
              onChange={event =>
                onFormChange(current => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
            />
          </label>
          <label className="text-sm font-semibold text-[#41524B]">
            讲师
            <input
              value={form.instructorName}
              onChange={event =>
                onFormChange(current => ({
                  ...current,
                  instructorName: event.target.value,
                }))
              }
              className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold text-[#41524B]">
          封面地址
          <input
            value={form.coverUrl}
            onChange={event =>
              onFormChange(current => ({
                ...current,
                coverUrl: event.target.value,
              }))
            }
            className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-semibold text-[#41524B]">
            分类
            <select
              value={form.category}
              onChange={event =>
                onFormChange(current => ({
                  ...current,
                  category: event.target.value as CourseCategory,
                }))
              }
              className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
            >
              {COURSE_CATEGORIES.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#41524B]">
            类型
            <select
              value={form.type}
              onChange={event =>
                onFormChange(current => ({
                  ...current,
                  type: event.target.value as CourseType,
                }))
              }
              className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
            >
              {COURSE_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#41524B]">
            学习人数
            <input
              type="number"
              min="0"
              step="1"
              value={form.learners}
              onChange={event =>
                onFormChange(current => ({
                  ...current,
                  learners: event.target.value,
                }))
              }
              className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold text-[#41524B]">
          更新原因
          <textarea
            value={form.reason}
            onChange={event =>
              onFormChange(current => ({
                ...current,
                reason: event.target.value,
              }))
            }
            placeholder="例如：课程封面和讲师信息完成校对"
            className="mt-2 min-h-[96px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={
              form.title.trim().length < 2 ||
              form.instructorName.trim().length < 1 ||
              form.reason.trim().length < 4 ||
              isSubmitting
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Edit3 className="h-4 w-4" />
            )}
            保存信息
          </button>
        </div>
      </motion.form>
    </div>
  );
}
