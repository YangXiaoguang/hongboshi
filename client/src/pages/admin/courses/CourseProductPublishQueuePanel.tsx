import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Ban,
  ClipboardList,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type {
  CourseProductContentQualityResult,
  CourseProductListItem,
} from "@shared/domain";
import {
  buildCourseProductPublishQueue,
  type CourseProductPublishQueueRisk,
} from "./courseProductPublishQueueModel";
import type { CourseProductWorkspaceStep } from "./courseProductListPresentation";

function riskClass(risk: CourseProductPublishQueueRisk) {
  if (risk === "high") return "bg-[#FFF0EA] text-[#AD503A]";
  if (risk === "medium") return "bg-[#FFF7E5] text-[#8F6B1C]";
  return "bg-[#EDF5EF] text-[#41675A]";
}

function riskLabel(risk: CourseProductPublishQueueRisk) {
  if (risk === "high") return "高风险";
  if (risk === "medium") return "需复核";
  return "低风险";
}

export function CourseProductPublishQueuePanel({
  items,
  contentQualityByProductId,
  scopeTotal,
  isTruncated,
  isLoading,
  onOpenWorkspace,
}: {
  items: CourseProductListItem[];
  contentQualityByProductId: Record<
    string,
    CourseProductContentQualityResult | undefined
  >;
  scopeTotal?: number;
  isTruncated?: boolean;
  isLoading?: boolean;
  onOpenWorkspace: (
    item: CourseProductListItem,
    step?: CourseProductWorkspaceStep
  ) => void;
}) {
  const queue = useMemo(
    () =>
      buildCourseProductPublishQueue({
        items,
        contentQualityByProductId,
      }),
    [contentQualityByProductId, items]
  );
  const loadedCount = items.length;
  const totalCount = scopeTotal ?? loadedCount;
  const scopeText = isTruncated
    ? `已分析当前筛选前 ${loadedCount} 个商品，共 ${totalCount} 个`
    : `已分析当前筛选 ${loadedCount} 个商品`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6 border-y border-[#E1D7C8] bg-[#FFFDF8]"
    >
      <div className="flex flex-col gap-3 border-b border-[#E8DED0] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
            <ClipboardList className="h-4 w-4 text-[#6F8F83]" />
            发布队列预案
          </div>
          <p className="mt-1 text-sm leading-6 text-[#6F7771]">
            {scopeText}；预案只读，不批量提交审核、不批量上架、不改变审计事实。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#EDF5EF] px-3 text-[#41675A]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {queue.batchPlan.totalCandidates} 个候选
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#F1E8DC] px-3 text-[#756B60]">
            <LockKeyhole className="h-3.5 w-3.5" />
            批量执行未开放
          </span>
          {isLoading && (
            <span className="inline-flex h-8 items-center rounded-full bg-[#EEF2F7] px-3 text-[#536783]">
              更新中
            </span>
          )}
        </div>
      </div>

      <div className="grid border-b border-[#E8DED0] lg:grid-cols-5">
        {queue.groups.map(group => {
          const firstItem = group.items[0];
          return (
            <div
              key={group.id}
              className="min-h-[172px] border-b border-[#E8DED0] px-4 py-4 lg:border-b-0 lg:border-r last:lg:border-r-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#8A8176]">
                    {group.label}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-[#243B35]">
                    {group.items.length}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${riskClass(
                    group.risk
                  )}`}
                >
                  {riskLabel(group.risk)}
                </span>
              </div>
              <p className="mt-3 min-h-[44px] text-xs leading-5 text-[#6F7771]">
                {group.description}
              </p>
              {firstItem ? (
                <button
                  onClick={() =>
                    onOpenWorkspace(firstItem, group.workspaceStep)
                  }
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                >
                  处理首个商品
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="mt-3 inline-flex h-8 items-center rounded-lg bg-[#F7F2EA] px-2.5 text-xs font-semibold text-[#8A8176]">
                  暂无队列项
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="divide-y divide-[#E8DED0]">
          {queue.batchPlan.actions.map(action => (
            <div
              key={action.id}
              className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_110px_110px_90px]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#243B35]">
                  {action.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#6F7771]">
                  {action.description}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8A8176]">候选</p>
                <p className="mt-1 text-lg font-semibold text-[#243B35]">
                  {action.candidateCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8A8176]">阻塞</p>
                <p className="mt-1 text-lg font-semibold text-[#AD503A]">
                  {action.blockerCount}
                </p>
              </div>
              <span
                className={`inline-flex h-7 w-fit items-center rounded-full px-2.5 text-xs font-semibold ${riskClass(
                  action.risk
                )}`}
              >
                {riskLabel(action.risk)}
              </span>
            </div>
          ))}
        </div>

        <aside className="border-t border-[#E8DED0] px-5 py-4 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
            <ShieldAlert className="h-4 w-4 text-[#AD503A]" />
            安全边界
          </div>
          <div className="mt-3 space-y-3 text-xs leading-5 text-[#6F7771]">
            <p>本阶段仅生成预案，不调用批量写入接口。</p>
            <p>提交审核、通过审核和上架仍需进入单商品工作台。</p>
            <p>批量上架未来必须增加二次审批、漂移预检和审计批次。</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#FFF0EA] px-2 py-2 text-[#AD503A]">
              <p className="font-semibold">
                {queue.batchPlan.riskSummary.high}
              </p>
              <p className="mt-1">高风险</p>
            </div>
            <div className="bg-[#FFF7E5] px-2 py-2 text-[#8F6B1C]">
              <p className="font-semibold">
                {queue.batchPlan.riskSummary.medium}
              </p>
              <p className="mt-1">需复核</p>
            </div>
            <div className="bg-[#EDF5EF] px-2 py-2 text-[#41675A]">
              <p className="font-semibold">{queue.batchPlan.riskSummary.low}</p>
              <p className="mt-1">低风险</p>
            </div>
          </div>
          {queue.archivedCount > 0 && (
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A8176]">
              <Ban className="h-3.5 w-3.5" />
              {queue.archivedCount} 个归档商品未纳入发布队列
            </p>
          )}
        </aside>
      </div>
    </motion.section>
  );
}
