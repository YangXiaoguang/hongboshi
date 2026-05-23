import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  LockKeyhole,
  RotateCcw,
  SearchCheck,
  Send,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type {
  CourseProductPublishQueueAction,
  CourseProductPublishQueueBatchTask,
  CourseProductPublishQueueBatchTaskApprovalPreflight,
  CourseProductPublishQueueBatchTaskListResult,
  CourseProductPublishQueueBatchTaskReviewAction,
  CourseProductPublishQueueResult,
  CourseProductPublishQueueRisk,
} from "@shared/domain";
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

function taskStatusLabel(status: CourseProductPublishQueueBatchTask["status"]) {
  if (status === "draft") return "草案";
  if (status === "pending_approval") return "待审批";
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已驳回";
  return "已取消";
}

function taskStatusClass(status: CourseProductPublishQueueBatchTask["status"]) {
  if (status === "approved") return "bg-[#EDF5EF] text-[#41675A]";
  if (status === "pending_approval") return "bg-[#FFF7E5] text-[#8F6B1C]";
  if (status === "rejected" || status === "canceled") {
    return "bg-[#FFF0EA] text-[#AD503A]";
  }
  return "bg-[#EEF2F7] text-[#536783]";
}

function taskActionLabel(action: CourseProductPublishQueueAction) {
  if (action === "submit_review") return "提交审核";
  if (action === "review_followup") return "审核跟进";
  if (action === "publish") return "上架草案";
  return "质量复查";
}

export function CourseProductPublishQueuePanel({
  queue,
  batchTasks,
  isLoading,
  isCreatingTask,
  mutatingTaskId,
  preflight,
  onOpenWorkspace,
  onCreateTask,
  onLoadTaskPreflight,
  onSubmitTask,
  onCancelTask,
  onReviewTask,
}: {
  queue?: CourseProductPublishQueueResult;
  batchTasks?: CourseProductPublishQueueBatchTaskListResult;
  isLoading?: boolean;
  isCreatingTask?: boolean;
  mutatingTaskId?: string;
  preflight?: {
    task: CourseProductPublishQueueBatchTask;
    preflight: CourseProductPublishQueueBatchTaskApprovalPreflight;
  };
  onOpenWorkspace: (
    courseId: number,
    step?: CourseProductWorkspaceStep
  ) => void;
  onCreateTask: (
    action: CourseProductPublishQueueAction,
    reason: string
  ) => void;
  onLoadTaskPreflight: (taskId: string) => void;
  onSubmitTask: (taskId: string, reason: string) => void;
  onCancelTask: (taskId: string, reason: string) => void;
  onReviewTask: (
    taskId: string,
    action: CourseProductPublishQueueBatchTaskReviewAction,
    reason: string
  ) => void;
}) {
  const [draftReason, setDraftReason] = useState("");
  const [taskReason, setTaskReason] = useState("");
  const totalScannedCount = queue?.summary.totalScannedCount ?? 0;
  const totalInScope = queue?.summary.totalInScope ?? 0;
  const candidateCount = queue?.summary.candidateCount ?? 0;
  const recentTasks = batchTasks?.items ?? [];
  const taskReasonReady = taskReason.trim().length >= 4;
  const scopeText = queue
    ? `服务端已分析当前筛选 ${totalScannedCount} 个商品，纳入发布队列 ${totalInScope} 个`
    : "正在读取服务端发布队列";

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
            {scopeText}
            ；草案只保存候选快照，不批量提交审核、不批量上架、不改变审计事实。
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#EDF5EF] px-3 text-[#41675A]">
            <ShieldCheck className="h-3.5 w-3.5" />
            {candidateCount} 个候选
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
        {(queue?.groups ?? []).map(group => {
          const firstItem = group.previewItems[0];
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
                    {group.totalCount}
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
                    onOpenWorkspace(firstItem.courseId, group.workspaceStep)
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

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="divide-y divide-[#E8DED0]">
          {(queue?.actions ?? []).map(action => (
            <div
              key={action.id}
              className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_86px_86px_78px_104px]"
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
              <button
                onClick={() => onCreateTask(action.id, draftReason)}
                disabled={
                  action.candidateCount === 0 ||
                  isCreatingTask ||
                  draftReason.trim().length < 4
                }
                className="inline-flex h-8 w-fit items-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-white px-2.5 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                生成草案
              </button>
            </div>
          ))}
        </div>

        <aside className="border-t border-[#E8DED0] px-5 py-4 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#243B35]">
            <ShieldAlert className="h-4 w-4 text-[#AD503A]" />
            草案审批台
          </div>
          <label className="mt-3 block text-xs font-semibold text-[#8A8176]">
            生成草案原因
          </label>
          <input
            value={draftReason}
            onChange={event => setDraftReason(event.target.value)}
            maxLength={120}
            placeholder="例如：月度上架前队列复核"
            className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#243B35] outline-none transition placeholder:text-[#B2AAA0] focus:border-[#7C9288] focus:ring-2 focus:ring-[#D5E4DC]"
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-[#FFF0EA] px-2 py-2 text-[#AD503A]">
              <p className="font-semibold">
                {queue?.summary.riskSummary.high ?? 0}
              </p>
              <p className="mt-1">高风险</p>
            </div>
            <div className="bg-[#FFF7E5] px-2 py-2 text-[#8F6B1C]">
              <p className="font-semibold">
                {queue?.summary.riskSummary.medium ?? 0}
              </p>
              <p className="mt-1">需复核</p>
            </div>
            <div className="bg-[#EDF5EF] px-2 py-2 text-[#41675A]">
              <p className="font-semibold">
                {queue?.summary.riskSummary.low ?? 0}
              </p>
              <p className="mt-1">低风险</p>
            </div>
          </div>

          <label className="mt-5 block text-xs font-semibold text-[#8A8176]">
            审批/取消原因
          </label>
          <input
            value={taskReason}
            onChange={event => setTaskReason(event.target.value)}
            maxLength={120}
            placeholder="例如：候选快照已复核，符合本轮发布边界"
            className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm text-[#243B35] outline-none transition placeholder:text-[#B2AAA0] focus:border-[#7C9288] focus:ring-2 focus:ring-[#D5E4DC]"
          />

          <div className="mt-4 border-y border-[#E8DED0]">
            <div className="flex items-center justify-between py-2">
              <p className="text-xs font-semibold text-[#8A8176]">最近草案</p>
              <span className="text-xs text-[#8A8176]">
                {batchTasks?.summary.totalTaskCount ?? 0} 个
              </span>
            </div>
            {recentTasks.length ? (
              <div className="divide-y divide-[#E8DED0]">
                {recentTasks.map(task => {
                  const isMutating = mutatingTaskId === task.id;
                  const canSubmit = task.status === "draft";
                  const canReview = task.status === "pending_approval";
                  const canCancel =
                    task.status === "draft" ||
                    task.status === "pending_approval";
                  return (
                    <div key={task.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#243B35]">
                            {taskActionLabel(task.action)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#6F7771]">
                            候选 {task.candidateCount} 个 · 阻塞{" "}
                            {task.blockerCount} 个
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${taskStatusClass(
                            task.status
                          )}`}
                        >
                          {taskStatusLabel(task.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          onClick={() => onLoadTaskPreflight(task.id)}
                          disabled={Boolean(mutatingTaskId)}
                          title="审批前漂移预检"
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#D8CEC0] bg-white px-2 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <SearchCheck className="h-3.5 w-3.5" />
                          预检
                        </button>
                        {canSubmit && (
                          <button
                            onClick={() => onSubmitTask(task.id, taskReason)}
                            disabled={
                              !taskReasonReady ||
                              Boolean(mutatingTaskId) ||
                              isMutating
                            }
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#D8CEC0] bg-white px-2 text-xs font-semibold text-[#41524B] transition hover:border-[#9FB3A9] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <Send className="h-3.5 w-3.5" />
                            提交
                          </button>
                        )}
                        {canReview && (
                          <>
                            <button
                              onClick={() =>
                                onReviewTask(task.id, "approve", taskReason)
                              }
                              disabled={
                                !taskReasonReady ||
                                Boolean(mutatingTaskId) ||
                                isMutating
                              }
                              className="inline-flex h-7 items-center gap-1 rounded-md border border-[#BFD4C6] bg-[#F4FAF5] px-2 text-xs font-semibold text-[#41675A] transition hover:border-[#8BAA99] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              通过
                            </button>
                            <button
                              onClick={() =>
                                onReviewTask(task.id, "reject", taskReason)
                              }
                              disabled={
                                !taskReasonReady ||
                                Boolean(mutatingTaskId) ||
                                isMutating
                              }
                              className="inline-flex h-7 items-center gap-1 rounded-md border border-[#EDCDBF] bg-[#FFF8F5] px-2 text-xs font-semibold text-[#AD503A] transition hover:border-[#D99C83] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              驳回
                            </button>
                          </>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => onCancelTask(task.id, taskReason)}
                            disabled={
                              !taskReasonReady ||
                              Boolean(mutatingTaskId) ||
                              isMutating
                            }
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-[#D8CEC0] bg-white px-2 text-xs font-semibold text-[#756B60] transition hover:border-[#B8AA99] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            取消
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="pb-3 text-xs leading-5 text-[#6F7771]">
                暂无发布队列草案。先在左侧生成草案，再提交审批。
              </p>
            )}
          </div>

          {preflight && (
            <div className="mt-4 border border-[#E1D7C8] bg-white px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#8A8176]">
                    漂移预检
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#243B35]">
                    {preflight.preflight.requiresRecreate
                      ? "需要重建草案"
                      : "预检通过"}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    preflight.preflight.requiresRecreate
                      ? "bg-[#FFF0EA] text-[#AD503A]"
                      : "bg-[#EDF5EF] text-[#41675A]"
                  }`}
                >
                  {preflight.preflight.currentCandidateCount} 个当前候选
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-[#F7F2EA] px-2 py-2 text-[#756B60]">
                  <p className="font-semibold">
                    {preflight.preflight.disappearedProductIds.length}
                  </p>
                  <p className="mt-1">消失</p>
                </div>
                <div className="bg-[#F7F2EA] px-2 py-2 text-[#756B60]">
                  <p className="font-semibold">
                    {preflight.preflight.newCandidateProductIds.length}
                  </p>
                  <p className="mt-1">新增</p>
                </div>
                <div className="bg-[#F7F2EA] px-2 py-2 text-[#756B60]">
                  <p className="font-semibold">
                    {preflight.preflight.statusChangedProductIds.length +
                      preflight.preflight.qualityChangedProductIds.length +
                      preflight.preflight.riskChangedProductIds.length}
                  </p>
                  <p className="mt-1">变化</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-xs leading-5 text-[#6F7771]">
                {preflight.preflight.notes.slice(0, 3).map(note => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-xs leading-5 text-[#6F7771]">
            通过审批只确认草案快照有效，不会自动提交审核、通过审核或上架商品。
          </p>
          {(queue?.summary.archivedCount ?? 0) > 0 && (
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#8A8176]">
              <Ban className="h-3.5 w-3.5" />
              {queue?.summary.archivedCount} 个归档商品未纳入发布队列
            </p>
          )}
        </aside>
      </div>
    </motion.section>
  );
}
