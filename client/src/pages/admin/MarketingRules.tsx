import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  Crown,
  PackageCheck,
  RefreshCw,
  Ticket,
} from "lucide-react";
import type {
  CourseMarketingRule,
  CourseMarketingRuleConsole,
} from "@shared/domain";
import { httpCourseMarketingRepository } from "@/features/courses";

const ruleTypeCopy = {
  course_coupon: "课程券",
  limited_discount: "限时活动",
  membership_discount: "会员价",
  path_bundle: "路径组合",
} satisfies Record<CourseMarketingRule["type"], string>;

const statusCopy = {
  active: "生效中",
  paused: "已暂停",
  expired: "已过期",
} satisfies Record<CourseMarketingRule["status"], string>;

const sourceCopy = {
  course_product: "课程商品",
  system: "系统规则",
  manual: "人工规则",
} satisfies Record<CourseMarketingRule["source"], string>;

const statusTone = {
  active: "bg-[#E6EDDF] text-[#41675A]",
  paused: "bg-[#F4EFE6] text-[#7B817C]",
  expired: "bg-[#F4E5DE] text-[#A65F48]",
} satisfies Record<CourseMarketingRule["status"], string>;

function formatMoney(amount: number) {
  return `¥${amount.toFixed(amount % 1 === 0 ? 0 : 1)}`;
}

function formatDiscount(rule: CourseMarketingRule) {
  if (rule.discount.kind === "fixed_amount") {
    return rule.discount.amount > 0
      ? `立减 ${formatMoney(rule.discount.amount)}`
      : "已包含活动价";
  }

  if (rule.discount.kind === "fixed_price") {
    return `${formatMoney(rule.discount.originalAmount)} -> ${formatMoney(
      rule.discount.payableAmount
    )}`;
  }

  return `${Math.round(rule.discount.rate * 100)}% 组合折扣，${rule.discount.minCourses}-${rule.discount.maxCourses} 门`;
}

function formatScope(rule: CourseMarketingRule) {
  if (rule.scope.courseIds.length > 0) {
    return `课程 ${rule.scope.courseIds.join("、")}`;
  }

  if (rule.scope.categories.length > 0) {
    return rule.scope.categories.join("、");
  }

  if (typeof rule.scope.vipOnly === "boolean") {
    return rule.scope.vipOnly ? "会员课程" : "非会员课程";
  }

  return "全课程";
}

function ruleIcon(type: CourseMarketingRule["type"]) {
  if (type === "membership_discount") return Crown;
  if (type === "path_bundle") return PackageCheck;
  if (type === "limited_discount") return BadgePercent;
  return Ticket;
}

export default function MarketingRules() {
  const [consoleData, setConsoleData] = useState<CourseMarketingRuleConsole>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const next = await httpCourseMarketingRepository.loadAdminConsole();
      setConsoleData(next);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "营销规则读取失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRules();
  }, []);

  const sortedRules = useMemo(
    () =>
      [...(consoleData?.rules ?? [])].sort(
        (left, right) =>
          right.priority - left.priority || left.id.localeCompare(right.id)
      ),
    [consoleData?.rules]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#E4DCCF] bg-[#FFFDF8] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#6F8F83]">CUX-G</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#243B35]">
              营销规则
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6D746F]">
              当前规则由已发布课程商品与系统会员/路径规则派生，先作为只读基线接入前台优惠展示，避免运营编辑能力早于订单金额口径。
            </p>
          </div>
          <button
            onClick={loadRules}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-65"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新规则
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-[#E7C7B8] bg-[#FFF3ED] px-4 py-3 text-sm text-[#A65F48]">
            {error}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["全部规则", consoleData?.summary.totalCount ?? 0],
          ["生效中", consoleData?.summary.activeCount ?? 0],
          ["课程券", consoleData?.summary.courseCouponCount ?? 0],
          ["路径组合", consoleData?.summary.pathBundleCount ?? 0],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-[#E4DCCF] bg-[#FFFDF8] p-5"
          >
            <p className="text-xs font-semibold text-[#7B817C]">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-[#243B35]">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-[#E4DCCF] bg-[#FFFDF8]">
        <div className="flex items-center justify-between gap-4 border-b border-[#E4DCCF] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#243B35]">规则清单</h2>
            <p className="mt-1 text-xs text-[#7B817C]">
              后续会在这里接入规则编辑、上下线、库存/有效期和审计。
            </p>
          </div>
          {consoleData?.serverTime && (
            <p className="hidden text-xs text-[#9AA19B] sm:block">
              同步时间{" "}
              {new Date(consoleData.serverTime).toLocaleString("zh-CN")}
            </p>
          )}
        </div>

        <div className="divide-y divide-[#E4DCCF]">
          {sortedRules.map(rule => {
            const Icon = ruleIcon(rule.type);
            return (
              <div
                key={rule.id}
                className="grid gap-4 px-5 py-5 lg:grid-cols-[44px_1.2fr_0.9fr_0.7fr]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[#243B35]">
                      {rule.name}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone[rule.status]}`}
                    >
                      {statusCopy[rule.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                    {rule.description}
                  </p>
                  <p className="mt-2 text-xs text-[#9AA19B]">{rule.id}</p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-[#243B35]">
                    {ruleTypeCopy[rule.type]} · {sourceCopy[rule.source]}
                  </p>
                  <p className="mt-2 text-[#7B817C]">{formatScope(rule)}</p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-[#A65F48]">
                    {formatDiscount(rule)}
                  </p>
                  <p className="mt-2 text-[#7B817C]">优先级 {rule.priority}</p>
                </div>
              </div>
            );
          })}

          {!isLoading && sortedRules.length === 0 && (
            <div className="px-5 py-14 text-center text-sm text-[#7B817C]">
              暂无营销规则
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
