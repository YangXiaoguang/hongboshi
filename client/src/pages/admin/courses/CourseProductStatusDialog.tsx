import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import type {
  CourseProductListItem,
  CourseProductStatus,
} from "@shared/domain";

export function CourseProductStatusDialog({
  product,
  targetStatus,
  reason,
  isSubmitting,
  onReasonChange,
  onCancel,
  onSubmit,
}: {
  product: CourseProductListItem;
  targetStatus: CourseProductStatus;
  reason: string;
  isSubmitting: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const isPublishing = targetStatus === "published";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18231F]/45 px-4">
      <motion.form
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
        className="w-full max-w-[520px] rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#8A8176]">状态动作</p>
            <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
              {isPublishing ? "上架课程商品" : "下架课程商品"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6F7771]">
              {product.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7D746B] transition hover:bg-[#F1E8DC]"
            aria-label="关闭状态动作"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold text-[#41524B]">
          操作原因
          <textarea
            value={reason}
            onChange={event => onReasonChange(event.target.value)}
            placeholder="例如：内容完成复核，允许本周活动曝光"
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
            disabled={reason.trim().length < 4 || isSubmitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPublishing ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
            确认{isPublishing ? "上架" : "下架"}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
