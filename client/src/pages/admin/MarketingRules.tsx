import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  Crown,
  History,
  PackageCheck,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Ticket,
  X,
} from "lucide-react";
import type {
  CourseMarketingAuditEvent,
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

const auditActionCopy = {
  rule_status_update: "状态变更",
} satisfies Record<CourseMarketingAuditEvent["action"], string>;

const statusTone = {
  active: "bg-[#E6EDDF] text-[#41675A]",
  paused: "bg-[#F4EFE6] text-[#7B817C]",
  expired: "bg-[#F4E5DE] text-[#A65F48]",
} satisfies Record<CourseMarketingRule["status"], string>;

type RuleStatusAction = "active" | "paused";
type RuleActionDraft = {
  ruleId: string;
  status: RuleStatusAction;
  reason: string;
};

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

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusValueText(value: unknown) {
  if (typeof value === "string" && value in statusCopy) {
    return statusCopy[value as CourseMarketingRule["status"]];
  }
  return String(value ?? "-");
}

function auditChangeText(event: CourseMarketingAuditEvent) {
  if (event.action === "rule_status_update") {
    return `${statusValueText(event.before.status)} -> ${statusValueText(
      event.after.status
    )}`;
  }
  return "规则已更新";
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
  const [isMutating, setIsMutating] = useState<string | undefined>();
  const [actionDraft, setActionDraft] = useState<RuleActionDraft>();
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

  const startRuleAction = (
    rule: CourseMarketingRule,
    status: RuleStatusAction
  ) => {
    setError(undefined);
    setActionDraft({
      ruleId: rule.id,
      status,
      reason: "",
    });
  };

  const submitRuleAction = async () => {
    if (!actionDraft) return;

    setIsMutating(actionDraft.ruleId);
    try {
      await httpCourseMarketingRepository.updateRuleStatus(actionDraft.ruleId, {
        status: actionDraft.status,
        reason: actionDraft.reason,
      });
      setActionDraft(undefined);
      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "营销规则状态更新失败");
    } finally {
      setIsMutating(undefined);
    }
  };

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
              当前规则由已发布课程商品与系统会员/路径规则派生，运营可先暂停或恢复活动曝光，所有动作都会留下原因和审计记录。
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
              暂停会立即影响前台营销快照，过期规则不支持恢复。
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
            const targetStatus: RuleStatusAction =
              rule.status === "active" ? "paused" : "active";
            const currentActionDraft =
              actionDraft?.ruleId === rule.id ? actionDraft : undefined;
            const canOperate = rule.status !== "expired";
            const isCurrentMutating = isMutating === rule.id;
            return (
              <div key={rule.id} className="px-5 py-5">
                <div className="grid gap-4 lg:grid-cols-[44px_minmax(0,1.2fr)_0.85fr_0.7fr_120px]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
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
                    <p className="mt-2 truncate text-xs text-[#9AA19B]">
                      {rule.id}
                    </p>
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
                    <p className="mt-2 text-[#7B817C]">
                      优先级 {rule.priority}
                    </p>
                  </div>
                  <div className="flex items-start lg:justify-end">
                    {canOperate ? (
                      <button
                        onClick={() => startRuleAction(rule, targetStatus)}
                        disabled={isCurrentMutating}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[#D8CDBC] px-3 text-xs font-semibold text-[#41524B] transition hover:border-[#B9A98F] hover:bg-[#F7F1E8] disabled:cursor-wait disabled:opacity-60"
                      >
                        {targetStatus === "paused" ? (
                          <PauseCircle className="mr-1.5 h-4 w-4" />
                        ) : (
                          <PlayCircle className="mr-1.5 h-4 w-4" />
                        )}
                        {targetStatus === "paused" ? "暂停" : "恢复"}
                      </button>
                    ) : (
                      <span className="rounded-full bg-[#F4E5DE] px-3 py-2 text-xs font-semibold text-[#A65F48]">
                        已锁定
                      </span>
                    )}
                  </div>
                </div>

                {currentActionDraft && (
                  <div className="mt-4 rounded-lg border border-[#E1D7C8] bg-[#FBF7EF] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#243B35]">
                          {currentActionDraft.status === "paused"
                            ? "暂停活动曝光"
                            : "恢复活动曝光"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#7B817C]">
                          本次操作会写入营销规则审计，并同步影响课程前台优惠展示。
                        </p>
                      </div>
                      <button
                        onClick={() => setActionDraft(undefined)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#7B817C] transition hover:bg-[#EFE6D8]"
                        aria-label="关闭"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={currentActionDraft.reason}
                      onChange={event =>
                        setActionDraft({
                          ...currentActionDraft,
                          reason: event.target.value,
                        })
                      }
                      rows={3}
                      placeholder="填写操作原因，至少 4 个字"
                      className="mt-3 min-h-[88px] w-full resize-none rounded-lg border border-[#D8CDBC] bg-white px-3 py-2 text-sm text-[#243B35] outline-none transition focus:border-[#6F8F83] focus:ring-2 focus:ring-[#6F8F83]/15"
                    />
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => setActionDraft(undefined)}
                        className="inline-flex h-9 items-center justify-center rounded-full border border-[#D8CDBC] px-4 text-sm font-semibold text-[#6D746F]"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => void submitRuleAction()}
                        disabled={
                          isCurrentMutating ||
                          currentActionDraft.reason.trim().length < 4
                        }
                        className="inline-flex h-9 items-center justify-center rounded-full bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        确认提交
                      </button>
                    </div>
                  </div>
                )}
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

      <section className="rounded-lg border border-[#E4DCCF] bg-[#FFFDF8]">
        <div className="flex items-center justify-between border-b border-[#E4DCCF] px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#6F8F83]" />
            <h2 className="text-lg font-semibold text-[#243B35]">最近审计</h2>
          </div>
          <span className="rounded-full bg-[#F1E8DC] px-2.5 py-1 text-xs font-semibold text-[#756B60]">
            {consoleData?.auditEvents.length ?? 0} 条
          </span>
        </div>

        {(consoleData?.auditEvents.length ?? 0) > 0 ? (
          <div className="divide-y divide-[#E4DCCF]">
            {consoleData?.auditEvents.slice(0, 6).map(event => (
              <div
                key={event.id}
                className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[150px_minmax(0,1fr)_180px]"
              >
                <div>
                  <p className="font-semibold text-[#243B35]">
                    {auditActionCopy[event.action]}
                  </p>
                  <p className="mt-1 text-xs text-[#8A8176]">
                    {formatDate(event.createdAt)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#41524B]">
                    {event.ruleName}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                    {auditChangeText(event)} · {event.reason}
                  </p>
                </div>
                <p className="text-xs text-[#8A8176]">操作者 {event.actorId}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[116px] items-center justify-center px-5 text-sm text-[#8A8176]">
            暂无营销规则操作记录
          </div>
        )}
      </section>
    </div>
  );
}
