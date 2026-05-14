import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileClock,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  ALL_AUDIT_CENTER_MODULE,
  type AuditCenterEvent,
  type AuditCenterListResult,
  type AuditCenterModule,
  type AuditCenterQuery,
} from "@shared/domain";
import { httpAuditCenterRepository } from "@/features/audit";

const moduleLabels = {
  catalog: "课程商品",
  user: "用户会员",
  order: "订单管理",
  transaction: "交易退款",
  counseling: "咨询运营",
  risk: "风险复核",
} satisfies Record<AuditCenterModule, string>;

const actionLabels: Record<string, string> = {
  status_update: "状态更新",
  price_update: "价格调整",
  info_update: "基础信息",
  review_update: "审核流转",
  content_update: "内容更新",
  activate: "开通会员",
  extend: "延期会员",
  expire: "标记到期",
  adjust_plan: "调整计划",
  close_pending: "关闭待支付",
  mark_exception: "标记异常",
  clear_exception: "解除异常",
  request_refund: "申请退款",
  resolve_exception: "解决异常",
  cancellation_policy_updated: "取消规则",
  complete_session: "完成服务",
  mark_no_show: "标记未到访",
  schedule_slot_added: "新增排班",
  schedule_slot_closed: "关闭排班",
  schedule_slot_restored: "恢复排班",
  counselor_profile_updated: "咨询师档案",
  counselor_service_status_updated: "服务状态",
  start_review: "开始复核",
  mark_contacted: "已联系",
  recommend_counseling: "建议咨询",
  escalate: "升级处理",
  resolve: "标记解决",
};

function actionLabel(action: string) {
  return actionLabels[action] ?? action;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function snapshotText(value: unknown) {
  if (value === undefined || value === null) return "无";
  const text = JSON.stringify(value);
  if (!text || text === "{}") return "无";
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}

function ModulePill({ module }: { module: AuditCenterModule }) {
  const styles = {
    catalog: "bg-[#E5ECE1] text-[#41675A]",
    user: "bg-[#EEF0F5] text-[#4A5C7A]",
    order: "bg-[#F1E8DC] text-[#806143]",
    transaction: "bg-[#F5E7E2] text-[#8A4D3C]",
    counseling: "bg-[#E5EEF0] text-[#3E6370]",
    risk: "bg-[#F6E9D8] text-[#8A5D2E]",
  } satisfies Record<AuditCenterModule, string>;

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[module]}`}
    >
      {moduleLabels[module]}
    </span>
  );
}

function AuditEventRow({ event }: { event: AuditCenterEvent }) {
  return (
    <tr className="align-top text-[#4F5C55]">
      <td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-[#243B35]">
        {formatTime(event.occurredAt)}
      </td>
      <td className="px-4 py-4">
        <ModulePill module={event.module} />
        <p className="mt-2 text-sm font-semibold text-[#243B35]">
          {actionLabel(event.action)}
        </p>
        <p className="mt-1 text-xs text-[#8A8176]">{event.action}</p>
      </td>
      <td className="px-4 py-4">
        <p className="text-sm font-semibold text-[#243B35]">
          {event.resource.label ?? event.resource.id ?? event.resource.type}
        </p>
        <p className="mt-1 text-xs text-[#8A8176]">
          {event.resource.type}
          {event.resource.id ? ` · ${event.resource.id}` : ""}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#66716A]">{event.summary}</p>
        {event.reason ? (
          <p className="mt-2 text-xs leading-5 text-[#8A8176]">
            原因：{event.reason}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-4">
        <p className="text-sm font-semibold text-[#243B35]">
          {event.actor.id ?? "系统"}
        </p>
        <p className="mt-1 text-xs text-[#8A8176]">
          {event.actor.roles.length
            ? event.actor.roles.join(" / ")
            : "无角色记录"}
        </p>
      </td>
      <td className="px-4 py-4">
        <div className="grid gap-2 text-xs leading-5 text-[#66716A]">
          <div>
            <span className="font-semibold text-[#243B35]">Before</span>
            <p className="mt-1 break-all rounded-md bg-[#F7F4EF] px-2 py-1">
              {snapshotText(event.before)}
            </p>
          </div>
          <div>
            <span className="font-semibold text-[#243B35]">After</span>
            <p className="mt-1 break-all rounded-md bg-[#F4F7F3] px-2 py-1">
              {snapshotText(event.after)}
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function AuditCenter() {
  const [data, setData] = useState<AuditCenterListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<Partial<AuditCenterQuery>>({
    module: ALL_AUDIT_CENTER_MODULE,
    page: 1,
    pageSize: 20,
  });

  async function load(nextQuery = query) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await httpAuditCenterRepository.loadEvents(nextQuery);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "审计中心暂时不可用");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const moduleCounts = useMemo(() => {
    const counts = new Map(
      data?.summary.moduleCounts.map(item => [item.module, item.count]) ?? []
    );
    return (
      data?.filters.modules.map(module => ({
        module,
        count: counts.get(module) ?? 0,
      })) ?? []
    );
  }, [data]);

  const updateQuery = (patch: Partial<AuditCenterQuery>) => {
    setQuery(previous => ({
      ...previous,
      ...patch,
      page: patch.page ?? 1,
    }));
  };

  const currentPage = data?.meta.page ?? Number(query.page ?? 1);
  const totalPages = data?.meta.totalPages ?? 0;

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            审计中心
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            跨模块操作追踪
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            聚合课程商品、用户会员、订单、交易、咨询运营和风险复核中的后台操作记录，统一查看操作者、资源、动作和前后状态摘要。
          </p>
        </div>
        <button
          onClick={() => void load(query)}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#CAD8D2] bg-white px-4 text-sm font-semibold text-[#41675A] transition hover:bg-[#F4F8F5]"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      </section>

      <section className="mt-6 grid border-y border-[#E1D7C8] bg-[#FFFDF8] md:grid-cols-3 xl:grid-cols-6">
        {moduleCounts.map(item => (
          <button
            key={item.module}
            onClick={() => updateQuery({ module: item.module })}
            className="flex items-center justify-between border-b border-[#E8DED0] px-4 py-4 text-left transition hover:bg-[#FBF7EF] md:border-r xl:border-b-0 last:md:border-r-0"
          >
            <span>
              <span className="block text-xs text-[#8A8176]">
                {moduleLabels[item.module]}
              </span>
              <span className="mt-1 block text-2xl font-semibold text-[#243B35]">
                {item.count}
              </span>
            </span>
            <FileClock className="h-5 w-5 text-[#6F8F83]" />
          </button>
        ))}
      </section>

      <section className="mt-6 grid gap-3 border border-[#E1D7C8] bg-[#FFFDF8] p-4 lg:grid-cols-[180px_180px_1fr_160px_160px_auto]">
        <select
          value={query.module ?? ALL_AUDIT_CENTER_MODULE}
          onChange={event =>
            updateQuery({
              module: event.target.value as AuditCenterQuery["module"],
            })
          }
          className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none focus:border-[#6F8F83]"
        >
          <option value={ALL_AUDIT_CENTER_MODULE}>全部模块</option>
          {data?.filters.modules.map(module => (
            <option key={module} value={module}>
              {moduleLabels[module]}
            </option>
          ))}
        </select>

        <select
          value={query.action ?? ""}
          onChange={event =>
            updateQuery({
              action: event.target.value || undefined,
            })
          }
          className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none focus:border-[#6F8F83]"
        >
          <option value="">全部动作</option>
          {data?.filters.actions.map(action => (
            <option key={action} value={action}>
              {actionLabel(action)}
            </option>
          ))}
        </select>

        <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm">
          <Search className="h-4 w-4 shrink-0 text-[#8A8176]" />
          <input
            value={query.resourceKeyword ?? ""}
            onChange={event =>
              updateQuery({
                resourceKeyword: event.target.value || undefined,
              })
            }
            placeholder="资源、原因、操作者"
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>

        <input
          type="date"
          value={query.dateFrom ?? ""}
          onChange={event =>
            updateQuery({
              dateFrom: event.target.value || undefined,
            })
          }
          className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none focus:border-[#6F8F83]"
        />

        <input
          type="date"
          value={query.dateTo ?? ""}
          onChange={event =>
            updateQuery({
              dateTo: event.target.value || undefined,
            })
          }
          className="h-10 rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm outline-none focus:border-[#6F8F83]"
        />

        <button
          onClick={() =>
            setQuery({
              module: ALL_AUDIT_CENTER_MODULE,
              page: 1,
              pageSize: 20,
            })
          }
          className="h-10 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
        >
          重置
        </button>
      </section>

      <section className="mt-6 overflow-hidden border border-[#E1D7C8] bg-[#FFFDF8]">
        <div className="flex flex-col gap-2 border-b border-[#E8DED0] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold">审计事件</h2>
            <p className="mt-1 text-xs leading-5 text-[#8A8176]">
              {data?.privacyNotice ?? "正在读取审计中心隐私边界。"}
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#E6EDDF] px-3 py-1 text-xs font-semibold text-[#41675A]">
            {data?.meta.total ?? 0} 条
          </span>
        </div>

        {isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-[#8A8176]">
            正在读取审计事件
          </div>
        ) : error ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-[#8A4D3C]">{error}</p>
          </div>
        ) : data?.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[#F8F3EA] text-xs text-[#8A8176]">
                <tr>
                  <th className="px-4 py-3 font-semibold">时间</th>
                  <th className="px-4 py-3 font-semibold">模块 / 动作</th>
                  <th className="px-4 py-3 font-semibold">资源与摘要</th>
                  <th className="px-4 py-3 font-semibold">操作者</th>
                  <th className="px-4 py-3 font-semibold">状态摘要</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED0]">
                {data.items.map(event => (
                  <AuditEventRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-[#243B35]">
              当前筛选下暂无审计事件
            </p>
            <p className="mt-2 text-sm text-[#8A8176]">
              可以切换模块、动作、日期或关键词查看其他操作记录。
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#E8DED0] px-5 py-4 text-sm text-[#66716A]">
          <span>
            第 {currentPage} / {Math.max(totalPages, 1)} 页
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() =>
                updateQuery({ page: Math.max(1, currentPage - 1) })
              }
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#D8CEC0] px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </button>
            <button
              disabled={currentPage >= Math.max(totalPages, 1)}
              onClick={() => updateQuery({ page: currentPage + 1 })}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#D8CEC0] px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
