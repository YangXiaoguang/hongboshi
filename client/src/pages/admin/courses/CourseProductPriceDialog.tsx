import type { Dispatch, SetStateAction } from "react";
import { motion } from "framer-motion";
import { Edit3, Loader2, X } from "lucide-react";
import type { CourseProductListItem } from "@shared/domain";

export type CourseProductPriceFormState = {
  amount: string;
  originalAmount: string;
  isFree: boolean;
  memberIncluded: boolean;
  reason: string;
};

export function CourseProductPriceDialog({
  product,
  form,
  isSubmitting,
  onFormChange,
  onCancel,
  onSubmit,
}: {
  product: CourseProductListItem;
  form: CourseProductPriceFormState;
  isSubmitting: boolean;
  onFormChange: Dispatch<SetStateAction<CourseProductPriceFormState>>;
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
        className="w-full max-w-[560px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#8A8176]">价格编辑</p>
            <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
              {product.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
            aria-label="关闭价格编辑"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#41524B]">
            售价
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              disabled={form.isFree}
              onChange={event =>
                onFormChange(current => ({
                  ...current,
                  amount: event.target.value,
                }))
              }
              className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83] disabled:bg-[#F4EFE7] disabled:text-[#9A8F82]"
            />
          </label>
          <label className="text-sm font-semibold text-[#41524B]">
            原价
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.originalAmount}
              onChange={event =>
                onFormChange(current => ({
                  ...current,
                  originalAmount: event.target.value,
                }))
              }
              className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border border-[#E1D7C8] bg-white px-3 py-2 text-sm font-semibold text-[#41524B]">
            <input
              type="checkbox"
              checked={form.isFree}
              onChange={event =>
                onFormChange(current => ({
                  ...current,
                  isFree: event.target.checked,
                  amount: event.target.checked ? "0" : current.amount,
                }))
              }
            />
            免费课程
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-[#E1D7C8] bg-white px-3 py-2 text-sm font-semibold text-[#41524B]">
            <input
              type="checkbox"
              checked={form.memberIncluded}
              onChange={event =>
                onFormChange(current => ({
                  ...current,
                  memberIncluded: event.target.checked,
                }))
              }
            />
            会员权益内
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold text-[#41524B]">
          改价原因
          <textarea
            value={form.reason}
            onChange={event =>
              onFormChange(current => ({
                ...current,
                reason: event.target.value,
              }))
            }
            placeholder="例如：配合课程专题活动调整本期价格"
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
            disabled={form.reason.trim().length < 4 || isSubmitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Edit3 className="h-4 w-4" />
            )}
            保存价格
          </button>
        </div>
      </motion.form>
    </div>
  );
}
