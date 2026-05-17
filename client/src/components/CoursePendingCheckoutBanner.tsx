import { motion } from "framer-motion";
import { ArrowRight, Clock3, ReceiptText, XCircle } from "lucide-react";
import {
  formatCheckoutMoney,
  type CoursePendingCheckoutPrompt,
} from "@/features/courses";
import { formatCheckoutDateTime } from "@/components/CourseCheckoutDrawer";

type CoursePendingCheckoutBannerVariant = "strip" | "panel" | "inline";

interface CoursePendingCheckoutBannerProps {
  description?: string;
  prompts: CoursePendingCheckoutPrompt[];
  title?: string;
  variant?: CoursePendingCheckoutBannerVariant;
  onCancel?: (prompt: CoursePendingCheckoutPrompt) => void;
  onResume: (prompt: CoursePendingCheckoutPrompt) => void;
}

const containerClass = {
  strip: "bg-[#FFFDF8] px-5 py-5 sm:px-8 lg:px-12",
  panel: "",
  inline: "",
} satisfies Record<CoursePendingCheckoutBannerVariant, string>;

const innerClass = {
  strip:
    "mx-auto grid max-w-[1200px] gap-4 border-y border-[#E4DCCF] py-5 lg:grid-cols-[260px_1fr] lg:items-center",
  panel:
    "rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5 sm:p-6",
  inline: "rounded-[24px] border border-[#E4DCCF] bg-[#FFFDF8] p-4",
} satisfies Record<CoursePendingCheckoutBannerVariant, string>;

export default function CoursePendingCheckoutBanner({
  description = "已创建的课程订单会在这里召回，可以继续支付或取消。",
  prompts,
  title = "待支付订单",
  variant = "strip",
  onCancel,
  onResume,
}: CoursePendingCheckoutBannerProps) {
  if (prompts.length === 0) return null;

  const compact = variant !== "strip";

  return (
    <section className={containerClass[variant]}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className={innerClass[variant]}
      >
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
            <ReceiptText className="h-4 w-4" />
            {title}
          </div>
          <p className="mt-2 text-sm leading-6 text-[#6D746F]">{description}</p>
        </div>

        <div
          className={compact ? "mt-4 grid gap-3" : "grid gap-3 lg:grid-cols-3"}
        >
          {prompts.map(prompt => (
            <div
              key={prompt.id}
              className="group min-w-0 rounded-[20px] border border-[#E4DCCF] bg-[#F9F5EE] p-4 text-left transition hover:border-[#AFC2AB] hover:bg-[#F4EFE6]"
            >
              <button
                onClick={() => onResume(prompt)}
                className="block w-full text-left"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="line-clamp-1 block text-sm font-semibold text-[#243B35]">
                      {prompt.title}
                    </span>
                    <span className="mt-1 line-clamp-1 block text-xs text-[#7B817C]">
                      {prompt.subtitle}
                    </span>
                  </span>
                  <span className="shrink-0 text-base font-semibold text-[#A65F48]">
                    {formatCheckoutMoney(prompt.checkout.payment.payableAmount)}
                  </span>
                </span>
                <span className="mt-4 flex items-center justify-between gap-3 border-t border-[#E4DCCF] pt-3 text-xs font-semibold text-[#6D746F]">
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5 shrink-0 text-[#6F8F83]" />
                    <span className="truncate">
                      保留至{" "}
                      {formatCheckoutDateTime(
                        prompt.checkout.payment.expiresAt
                      )}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center text-[#41675A] transition group-hover:text-[#243B35]">
                    继续支付
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </span>
                </span>
              </button>

              {onCancel && (
                <button
                  onClick={() => onCancel(prompt)}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-full border border-[#D8CEC0] text-xs font-semibold text-[#6D746F] transition hover:bg-[#FFFDF8]"
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  取消订单
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
