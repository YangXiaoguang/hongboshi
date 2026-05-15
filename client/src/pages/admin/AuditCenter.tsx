import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileClock,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  ALL_AUDIT_CENTER_MODULE,
  type AuditCenterDetailResult,
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

function snapshotDetailText(value: unknown) {
  if (value === undefined || value === null) return "无";
  const text = JSON.stringify(value, null, 2);
  if (!text || text === "{}") return "无";
  return text;
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

function AuditEventRow({
  event,
  onInspect,
}: {
  event: AuditCenterEvent;
  onInspect: (eventId: string) => void;
}) {
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
      <td className="px-4 py-4">
        <button
          onClick={() => onInspect(event.id)}
          title="查看审计详情"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8CEC0] bg-white text-[#41675A] transition hover:bg-[#F4F8F5]"
        >
          <Eye className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function AuditDetailDrawer({
  detail,
  isLoading,
  error,
  onClose,
}: {
  detail: AuditCenterDetailResult | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const event = detail?.event;

  return (
    <div className="fixed inset-0 z-50 bg-[#1B2B26]/25">
      <button
        aria-label="关闭审计详情"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <aside className="relative ml-auto flex h-full w-full max-w-2xl flex-col border-l border-[#D8CEC0] bg-[#FFFDF8] shadow-2xl shadow-[#243B35]/20">
        <div className="flex items-start justify-between gap-4 border-b border-[#E8DED0] px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8B7E6D]">
              事件详情
            </p>
            <h2 className="mt-2 break-all text-xl font-semibold text-[#243B35]">
              {event?.id ?? "正在读取"}
            </h2>
          </div>
          <button
            onClick={onClose}
            title="关闭"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D8CEC0] bg-white text-[#66716A] transition hover:bg-[#F4F8F5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center px-6 text-sm text-[#8A8176]">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在读取审计事件详情
          </div>
        ) : error ? (
          <div className="px-6 py-10">
            <div className="flex items-center gap-2 rounded-lg border border-[#F0C7B7] bg-[#FFF0EA] px-4 py-3 text-sm text-[#AD503A]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : detail && event ? (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <ModulePill module={event.module} />
              <span className="rounded-full bg-[#F1E8DC] px-2.5 py-1 text-xs font-semibold text-[#806143]">
                {actionLabel(event.action)}
              </span>
            </div>

            <div className="mt-5 grid gap-4 text-sm text-[#4F5C55]">
              <section className="border-y border-[#E8DED0] py-4">
                <h3 className="text-sm font-semibold text-[#243B35]">
                  来源定位
                </h3>
                <dl className="mt-3 grid gap-2 text-xs leading-5 text-[#66716A] sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-[#243B35]">源事件 ID</dt>
                    <dd className="break-all">{detail.source.sourceEventId}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#243B35]">资源</dt>
                    <dd className="break-all">
                      {detail.source.resourceLabel ??
                        detail.source.resourceId ??
                        detail.source.resourceType}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-[#243B35]">定位提示</dt>
                    <dd>{detail.source.traceHint}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-[#243B35]">
                  操作摘要
                </h3>
                <div className="mt-3 grid gap-3 text-xs leading-5 text-[#66716A]">
                  <p>{event.summary}</p>
                  <p>发生时间：{formatTime(event.occurredAt)}</p>
                  <p>操作者：{event.actor.id ?? "系统"}</p>
                  <p>
                    操作者角色：
                    {event.actor.roles.length
                      ? event.actor.roles.join(" / ")
                      : "无角色记录"}
                  </p>
                  {event.reason ? <p>原因：{event.reason}</p> : null}
                </div>
              </section>

              <section className="grid gap-3">
                <h3 className="text-sm font-semibold text-[#243B35]">
                  变更摘要
                </h3>
                <div>
                  <p className="text-xs font-semibold text-[#243B35]">Before</p>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#F7F4EF] p-3 text-xs leading-5 text-[#66716A]">
                    {snapshotDetailText(event.before)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#243B35]">After</p>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#F4F7F3] p-3 text-xs leading-5 text-[#66716A]">
                    {snapshotDetailText(event.after)}
                  </pre>
                </div>
              </section>

              <p className="border-t border-[#E8DED0] pt-4 text-xs leading-5 text-[#8A8176]">
                {detail.privacyNotice}
              </p>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

export default function AuditCenter() {
  const [data, setData] = useState<AuditCenterListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditCenterDetailResult | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
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

  async function exportCsv() {
    if (isExporting) return;

    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);
    try {
      const result = await httpAuditCenterRepository.exportCsv(query);
      const blob = new Blob([result.content], {
        type: result.contentType,
      });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
      setExportSuccess(`已生成 ${result.filename}`);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "审计中心导出暂时不可用"
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function inspectEvent(eventId: string) {
    setSelectedEventId(eventId);
    setDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);
    try {
      const result = await httpAuditCenterRepository.loadEventDetail(eventId);
      setDetail(result);
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : "审计事件详情暂时不可用"
      );
    } finally {
      setIsDetailLoading(false);
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void exportCsv()}
            disabled={isExporting}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#DCCDBB] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#53675D] transition hover:bg-[#F8F3EA] disabled:cursor-wait disabled:opacity-70"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            导出 CSV
          </button>
          <button
            onClick={() => void load(query)}
            className="inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-[#CAD8D2] bg-white px-4 text-sm font-semibold text-[#41675A] transition hover:bg-[#F4F8F5]"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
        </div>
      </section>

      {(exportError || exportSuccess) && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            exportError
              ? "border-[#F0C7B7] bg-[#FFF0EA] text-[#AD503A]"
              : "border-[#C9DDC8] bg-[#F2F8EF] text-[#41675A]"
          }`}
        >
          {exportError ? (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{exportError ?? exportSuccess}</span>
        </div>
      )}

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
            <p className="mt-1 text-xs leading-5 text-[#8A8176]">
              CSV 导出按当前筛选条件输出完整结果，不受当前分页影响。
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
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-[#F8F3EA] text-xs text-[#8A8176]">
                <tr>
                  <th className="px-4 py-3 font-semibold">时间</th>
                  <th className="px-4 py-3 font-semibold">模块 / 动作</th>
                  <th className="px-4 py-3 font-semibold">资源与摘要</th>
                  <th className="px-4 py-3 font-semibold">操作者</th>
                  <th className="px-4 py-3 font-semibold">状态摘要</th>
                  <th className="px-4 py-3 font-semibold">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED0]">
                {data.items.map(event => (
                  <AuditEventRow
                    key={event.id}
                    event={event}
                    onInspect={eventId => void inspectEvent(eventId)}
                  />
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

      {selectedEventId ? (
        <AuditDetailDrawer
          detail={detail}
          isLoading={isDetailLoading}
          error={detailError}
          onClose={() => {
            setSelectedEventId(null);
            setDetail(null);
            setDetailError(null);
          }}
        />
      ) : null}
    </div>
  );
}
