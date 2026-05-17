import { useEffect, useState, type ElementType } from "react";
import { motion } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Circle,
  Clock3,
  Compass,
  FileText,
  HeartHandshake,
  ListChecks,
  LockKeyhole,
  PenLine,
  PlayCircle,
  Route,
  Save,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/NotFound";
import {
  canEnterCourseLearning,
  createCourseCompletionFeedback,
  createCourseLearningSession,
  getCourseAccessDescription,
  getLearningPathForCourse,
  getNextCoursesInLearningPath,
  useCourseAccess,
  useCourseDetail,
  useCourseEngagement,
  useCoursePractice,
  type Course,
  type CourseAccessResult,
  type CourseChapter,
  type CourseChapterMaterial,
  type CourseCompletionFeedback,
  type CourseDetail,
  type CoursePracticeRecord,
  type CoursePracticeSummary,
} from "@/features/courses";
import { httpCourseLearningRecordRepository } from "@/features/courses/api/httpCourseLearningRecordRepository";

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

function formatPracticeTime(value?: string): string {
  if (!value) return "尚未保存";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未保存";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCompletionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "本机记录";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const practiceSyncStatusCopy = {
  local_only: "本机保存",
  sync_pending: "待同步",
  synced: "已同步",
} satisfies Record<CoursePracticeRecord["syncStatus"], string>;

function LearningStat({
  icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  const Icon = icon;

  return (
    <div className="min-w-0 border-l border-white/14 pl-4 first:border-l-0 first:pl-0">
      <Icon className="h-4 w-4 text-[#C8D8C0]" />
      <p className="mt-3 truncate text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/58">{label}</p>
    </div>
  );
}

function SupportTile({
  icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) {
  const Icon = icon;

  return (
    <div className="rounded-[20px] border border-[#E4DCCF] bg-[#FFFDF8] p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A]">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-[#243B35]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#6D746F]">{description}</p>
    </div>
  );
}

function LoadingLearningPage() {
  return (
    <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-220px)] max-w-[1120px] items-center px-5 py-14 sm:px-8">
        <div className="w-full rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-[#6F8F83]">正在进入学习页</p>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded-full bg-[#ECE5DB]" />
              <div className="h-4 w-2/3 rounded-full bg-[#ECE5DB]" />
              <div className="h-4 w-1/2 rounded-full bg-[#ECE5DB]" />
            </div>
            <div className="h-40 rounded-[24px] bg-[#ECE5DB]" />
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

function LockedLearningPage({
  course,
  access,
  onBackToDetail,
  onGoCourses,
}: {
  course: CourseDetail;
  access: CourseAccessResult;
  onBackToDetail: () => void;
  onGoCourses: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
      <AppHeader />
      <main className="mx-auto flex min-h-[calc(100vh-220px)] max-w-[1080px] items-center px-5 py-14 sm:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="grid w-full overflow-hidden rounded-[32px] border border-[#E4DCCF] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/6 lg:grid-cols-[1fr_380px]"
        >
          <div className="p-6 sm:p-8 lg:p-10">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#F4E5DE] text-[#A65F48]">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <p className="mt-7 text-sm font-semibold text-[#6F8F83]">
              课程尚未解锁
            </p>
            <h1 className="mt-3 max-w-[680px] text-3xl font-semibold leading-tight text-[#243B35] sm:text-4xl">
              {course.title}
            </h1>
            <p className="mt-4 max-w-[620px] text-sm leading-7 text-[#6D746F]">
              {getCourseAccessDescription(access.status)}
              学习页会在权益确认后记录章节进度，当前不会绕过购买或会员边界。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onBackToDetail}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#243B35] px-6 text-sm font-semibold text-white transition hover:bg-[#315047]"
              >
                返回课程详情
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <button
                onClick={onGoCourses}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#D8CEC0] px-6 text-sm font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6]"
              >
                回到课程中心
              </button>
            </div>
          </div>
          <img
            src={course.coverUrl}
            alt=""
            className="h-72 w-full object-cover lg:h-full"
          />
        </motion.section>
      </main>
      <AppFooter />
    </div>
  );
}

function ChapterRow({
  chapter,
  stepNumber,
  isCompleted,
  isCurrent,
  isActive,
  hasPracticeDraft,
  isPracticeCompleted,
  onComplete,
  onSelect,
}: {
  chapter: CourseChapter;
  stepNumber: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isActive: boolean;
  hasPracticeDraft: boolean;
  isPracticeCompleted: boolean;
  onComplete: () => void;
  onSelect: () => void;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className={`grid gap-4 border-b border-[#E7DED0] py-5 last:border-b-0 sm:grid-cols-[52px_1fr_auto] ${
        isCurrent ? "bg-[#F7F1E8]" : "bg-transparent"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${
          isCompleted
            ? "bg-[#DDE8D9] text-[#41675A]"
            : isCurrent
              ? "bg-[#243B35] text-white"
              : "bg-[#ECE5DB] text-[#6D746F]"
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          String(stepNumber).padStart(2, "0")
        )}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {isCurrent && (
            <span className="rounded-full bg-[#243B35] px-2.5 py-1 text-xs font-semibold text-white">
              当前章
            </span>
          )}
          {isCompleted && (
            <span className="rounded-full bg-[#E6EDDF] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
              已完成
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F4EFE6] px-2.5 py-1 text-xs font-semibold text-[#6D746F]">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDuration(chapter.durationMinutes)}
          </span>
          <span className="rounded-full bg-[#F4EFE6] px-2.5 py-1 text-xs font-semibold text-[#6D746F]">
            {chapter.lessonCount} 节
          </span>
        </div>
        <h3 className="mt-3 break-words text-lg font-semibold leading-snug text-[#243B35]">
          <button
            onClick={onSelect}
            className="text-left transition hover:text-[#5F7F73]"
          >
            {chapter.title}
          </button>
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#6D746F]">
          {chapter.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {isActive && (
            <span className="rounded-full bg-[#243B35] px-2.5 py-1 text-xs font-semibold text-white">
              正在查看
            </span>
          )}
          {hasPracticeDraft && (
            <span className="rounded-full bg-[#F2E6C9] px-2.5 py-1 text-xs font-semibold text-[#7A5B31]">
              有练习草稿
            </span>
          )}
          {isPracticeCompleted && (
            <span className="rounded-full bg-[#E6EDDF] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
              练习完成
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <button
          onClick={onSelect}
          className="inline-flex h-10 min-w-[96px] items-center justify-center rounded-full border border-[#D8CEC0] px-4 text-xs font-semibold text-[#4F5B54] transition hover:bg-[#FFFDF8]"
        >
          查看练习
        </button>
        <button
          onClick={onComplete}
          className={`inline-flex h-10 min-w-[112px] items-center justify-center rounded-full px-4 text-xs font-semibold transition ${
            isCompleted
              ? "border border-[#D8CEC0] text-[#6D746F] hover:bg-[#FFFDF8]"
              : "bg-[#243B35] text-white hover:bg-[#315047]"
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Circle className="mr-1.5 h-3.5 w-3.5" />
          )}
          {isCompleted ? "已完成" : "标记完成"}
        </button>
      </div>
    </motion.article>
  );
}

function PracticeStatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#E7DED0] py-2 last:border-b-0">
      <span className="text-xs font-semibold text-[#7B817C]">{label}</span>
      <span className="text-right text-xs font-semibold text-[#243B35]">
        {value}
      </span>
    </div>
  );
}

function PracticeWorkspacePanel({
  chapter,
  stepNumber,
  material,
  record,
  summary,
  draft,
  onDraftChange,
  onSaveDraft,
  onToggleCompleted,
}: {
  chapter: CourseChapter;
  stepNumber: number;
  material: CourseChapterMaterial;
  record?: CoursePracticeRecord;
  summary: CoursePracticeSummary;
  draft: string;
  onDraftChange: (value: string) => void;
  onSaveDraft: () => void;
  onToggleCompleted: (isCompleted: boolean) => void;
}) {
  const isCompleted = record?.isPracticeCompleted ?? false;

  return (
    <motion.div
      key={chapter.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
          <FileText className="h-4 w-4" />
          资料与练习
        </p>
        <span className="shrink-0 rounded-full bg-[#F4EFE6] px-2.5 py-1 text-xs font-semibold text-[#6D746F]">
          第 {stepNumber} 章
        </span>
      </div>

      <div className="mt-5 rounded-[20px] bg-[#F7F1E8] p-4">
        <p className="text-xs font-semibold text-[#6F8F83]">当前查看</p>
        <h2 className="mt-2 break-words text-xl font-semibold leading-snug text-[#243B35]">
          {chapter.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6D746F]">
          {chapter.description}
        </p>
      </div>

      <section className="mt-5 rounded-[20px] border border-[#E4DCCF] p-4">
        <p className="inline-flex items-center gap-2 text-xs font-semibold text-[#6F8F83]">
          <FileText className="h-3.5 w-3.5" />
          章节讲义
        </p>
        <h3 className="mt-3 text-base font-semibold text-[#243B35]">
          {material.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#6D746F]">
          {material.summary}
        </p>
        <div className="mt-4 space-y-2">
          {material.keyPoints.map((point, index) => (
            <p
              key={`${point}-${index}`}
              className="flex gap-2 text-xs leading-5 text-[#6D746F]"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6F8F83]" />
              <span>{point}</span>
            </p>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <label
          htmlFor="course-practice-note"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#6F8F83]"
        >
          <PenLine className="h-3.5 w-3.5" />
          练习记录
        </label>
        <textarea
          id="course-practice-note"
          value={draft}
          onChange={event => onDraftChange(event.target.value)}
          placeholder="写下本章行动计划、触发点、身体感受或想继续观察的问题。"
          className="mt-3 min-h-[138px] w-full resize-y rounded-[18px] border border-[#D8CEC0] bg-[#FFFDF8] px-4 py-3 text-sm leading-6 text-[#243B35] outline-none transition placeholder:text-[#A0A8A1] focus:border-[#6F8F83] focus:ring-2 focus:ring-[#DDE8D9]"
        />
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onSaveDraft}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-[#243B35] px-4 text-xs font-semibold text-white transition hover:bg-[#315047]"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            保存草稿
          </button>
          <button
            onClick={() => onToggleCompleted(!isCompleted)}
            className={`inline-flex h-10 flex-1 items-center justify-center rounded-full px-4 text-xs font-semibold transition ${
              isCompleted
                ? "bg-[#E6EDDF] text-[#41675A] hover:bg-[#DDE8D9]"
                : "border border-[#D8CEC0] text-[#4F5B54] hover:bg-[#F4EFE6]"
            }`}
          >
            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
            {isCompleted ? "练习已完成" : "标记练习完成"}
          </button>
        </div>
      </section>

      <div className="mt-5 rounded-[18px] bg-[#F9F5EE] px-4 py-3">
        <PracticeStatusRow label="素材状态" value="占位待接真实文件" />
        <PracticeStatusRow label="讲义来源" value={material.sourceLabel} />
        <PracticeStatusRow
          label="保存状态"
          value={record ? practiceSyncStatusCopy[record.syncStatus] : "未保存"}
        />
        <PracticeStatusRow
          label="最近更新"
          value={formatPracticeTime(record?.updatedAt)}
        />
      </div>

      <div className="mt-5 rounded-[18px] border border-[#E4DCCF] px-4 py-3">
        <p className="text-xs font-semibold text-[#6F8F83]">练习摘要</p>
        <p className="mt-2 text-sm leading-6 text-[#6D746F]">
          已保存 {summary.draftedCount} / {summary.totalChapters} 章草稿，完成{" "}
          {summary.completedCount} / {summary.totalChapters} 章练习。
        </p>
      </div>
    </motion.div>
  );
}

function CompletionMetricTile({
  metric,
}: {
  metric: CourseCompletionFeedback["metrics"][number];
}) {
  return (
    <div className="min-w-0 border-t border-[#D8CEC0] pt-4">
      <p className="text-xs font-semibold text-[#6F8F83]">{metric.label}</p>
      <p className="mt-2 break-words text-2xl font-semibold text-[#243B35]">
        {metric.value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#7B817C]">
        {metric.description}
      </p>
    </div>
  );
}

function CertificatePreviewCard({
  feedback,
}: {
  feedback: CourseCompletionFeedback;
}) {
  const certificate = feedback.certificatePreview;

  return (
    <div className="overflow-hidden rounded-[28px] bg-[#243B35] text-white shadow-sm shadow-[#243B35]/10">
      <div className="relative min-h-[340px] p-6 sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#C8D8C0]" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#C8D8C0]">
            <Award className="h-4 w-4" />
            阶段证明预览
          </p>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/72">
            待正式签发
          </span>
        </div>

        <div className="mt-10">
          <p className="text-xs font-semibold text-white/52">课程名称</p>
          <h3 className="mt-3 break-words text-2xl font-semibold leading-tight">
            {certificate.courseTitle}
          </h3>
          <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#DDE8D9]">
            <Route className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{certificate.learningPathTitle}</span>
          </p>
        </div>

        <div className="mt-9 grid gap-3 text-sm text-white/78 sm:grid-cols-2">
          <div className="border-t border-white/12 pt-3">
            <p className="text-xs text-white/44">完成时间</p>
            <p className="mt-1 font-semibold text-white">
              {formatCompletionDate(certificate.completedAt)}
            </p>
          </div>
          <div className="border-t border-white/12 pt-3">
            <p className="text-xs text-white/44">章节</p>
            <p className="mt-1 font-semibold text-white">
              {certificate.completedChapters}/{certificate.totalChapters}
            </p>
          </div>
          <div className="border-t border-white/12 pt-3">
            <p className="text-xs text-white/44">练习</p>
            <p className="mt-1 font-semibold text-white">
              {certificate.practiceCompletedCount}/{certificate.totalChapters}
            </p>
          </div>
          <div className="border-t border-white/12 pt-3">
            <p className="text-xs text-white/44">证书编号</p>
            <p className="mt-1 font-semibold text-white">
              {certificate.certificateId ?? "正式签发后生成"}
            </p>
          </div>
        </div>

        <p className="mt-8 border-t border-white/12 pt-4 text-xs leading-5 text-white/52">
          本地完成证明预览，正式证书将在服务端学习档案和签发规则接入后生成。
        </p>
      </div>
    </div>
  );
}

function CourseCompletionFeedbackPanel({
  feedback,
  onGoGrowth,
  onOpenNextCourse,
  onReviewCourse,
}: {
  feedback: CourseCompletionFeedback;
  onGoGrowth: () => void;
  onOpenNextCourse: () => void;
  onReviewCourse: () => void;
}) {
  const hasNextCourse =
    feedback.nextStep.kind === "next_course" && feedback.nextStep.course;

  return (
    <section className="bg-[#FFFDF8] px-5 py-12 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-[1220px] gap-8 rounded-[32px] border border-[#E4DCCF] bg-[#F3EDE4] p-6 shadow-sm shadow-[#243B35]/5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
            <Trophy className="h-4 w-4" />
            课程完成反馈
          </p>
          <h2 className="mt-3 max-w-[720px] break-words text-3xl font-semibold leading-tight text-[#243B35] sm:text-4xl">
            {feedback.title}
          </h2>
          <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#6D746F]">
            {feedback.description}
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {feedback.metrics.map(metric => (
              <CompletionMetricTile key={metric.label} metric={metric} />
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-[#D8CEC0] bg-[#FFFDF8] p-5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
                <ClipboardCheck className="h-4 w-4" />
                练习沉淀
              </p>
              <h3 className="mt-3 text-xl font-semibold text-[#243B35]">
                {feedback.practiceInsight.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                {feedback.practiceInsight.description}
              </p>
            </div>

            <div className="rounded-[24px] border border-[#D8CEC0] bg-[#FFFDF8] p-5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
                <CalendarCheck className="h-4 w-4" />
                下一步
              </p>
              <h3 className="mt-3 break-words text-xl font-semibold text-[#243B35]">
                {feedback.nextStep.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                {feedback.nextStep.description}
              </p>
            </div>
          </div>
        </div>

        <aside className="min-w-0 space-y-4">
          <CertificatePreviewCard feedback={feedback} />
          <div className="grid gap-3">
            <button
              onClick={hasNextCourse ? onOpenNextCourse : onGoGrowth}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#243B35] px-5 text-sm font-semibold text-white transition hover:bg-[#315047]"
            >
              {feedback.nextStep.actionLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <button
              onClick={onGoGrowth}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D8CEC0] px-5 text-sm font-semibold text-[#4F5B54] transition hover:bg-[#FFFDF8]"
            >
              查看成长空间
            </button>
            <button
              onClick={onReviewCourse}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D8CEC0] px-5 text-sm font-semibold text-[#4F5B54] transition hover:bg-[#FFFDF8]"
            >
              复习本课程
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function NextCoursePreview({
  course,
  onOpen,
}: {
  course: Course;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group mt-5 grid w-full gap-4 text-left sm:grid-cols-[118px_1fr]"
    >
      <img
        src={course.coverUrl}
        alt=""
        className="h-28 w-full rounded-[18px] object-cover sm:w-[118px]"
      />
      <span className="min-w-0">
        <span className="inline-flex rounded-full bg-[#E6EDDF] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
          同路径下一课
        </span>
        <span className="mt-3 block break-words text-lg font-semibold leading-snug text-[#243B35] group-hover:text-[#5F7F73]">
          {course.title}
        </span>
        <span className="mt-2 block text-xs leading-5 text-[#7B817C]">
          {course.teacher} · {course.category}
        </span>
      </span>
    </button>
  );
}

export default function CourseLearning() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/courses/:courseId/learn");
  const { user, isLoggedIn } = useAuth();
  const remoteUserId = isLoggedIn ? user?.id : undefined;
  const courseId = Number(params?.courseId);
  const { course, allCourses, isLoading } = useCourseDetail(
    Number.isInteger(courseId) ? courseId : undefined
  );
  const { getCourseAccess, isSyncing: isAccessSyncing } = useCourseAccess();
  const { completeChapter, engagementSyncError, getProgress, startCourse } =
    useCourseEngagement({
      userId: remoteUserId,
      enableRemoteSync: Boolean(remoteUserId),
      favoriteSource: "course_learning",
    });
  const {
    practiceSyncError,
    getRecord,
    getSummary,
    materialForChapter,
    saveDraft,
    setPracticeCompleted,
  } = useCoursePractice({
    userId: remoteUserId,
    enableRemoteSync: Boolean(remoteUserId),
  });
  const [activeChapterId, setActiveChapterId] = useState<string | undefined>();
  const [practiceDraft, setPracticeDraft] = useState("");
  const [completionSyncKey, setCompletionSyncKey] = useState<
    string | undefined
  >();
  const [completionSyncStatus, setCompletionSyncStatus] = useState<
    "local" | "syncing" | "synced" | "failed"
  >(remoteUserId ? "syncing" : "local");
  const access = course ? getCourseAccess(course) : undefined;
  const canLearn = access ? canEnterCourseLearning(access) : false;
  const progress = course ? getProgress(course.id) : undefined;
  const syncError = engagementSyncError ?? practiceSyncError;
  const learningRecordLabel =
    !remoteUserId || completionSyncStatus === "local"
      ? "本机保存"
      : syncError || completionSyncStatus === "failed"
        ? "待同步"
        : "服务端同步";
  const completionPracticeSummary =
    course && canLearn ? getSummary(course) : undefined;
  const completionLearningPath = course
    ? getLearningPathForCourse(course)
    : undefined;

  useEffect(() => {
    if (!course || !canLearn || progress) return;
    startCourse(course.id);
  }, [canLearn, course, progress, startCourse]);

  useEffect(() => {
    if (!course || !canLearn) return;

    setActiveChapterId(prevChapterId => {
      const hasPreviousChapter =
        prevChapterId &&
        course.chapters.some(chapter => chapter.id === prevChapterId);
      if (hasPreviousChapter) return prevChapterId;

      return createCourseLearningSession(course, progress).currentChapter.id;
    });
  }, [canLearn, course, progress]);

  useEffect(() => {
    if (!course || !canLearn) {
      setPracticeDraft("");
      return;
    }

    const targetChapterId =
      activeChapterId ??
      createCourseLearningSession(course, progress).currentChapter.id;
    setPracticeDraft(getRecord(course.id, targetChapterId)?.note ?? "");
  }, [activeChapterId, canLearn, course, getRecord, progress]);

  useEffect(() => {
    if (!remoteUserId) {
      setCompletionSyncStatus("local");
      return;
    }

    if (
      !course ||
      !canLearn ||
      !progress ||
      progress.status !== "completed" ||
      !completionPracticeSummary ||
      !completionLearningPath
    ) {
      setCompletionSyncStatus("syncing");
      return;
    }

    const nextSyncKey = `${course.id}:${progress.updatedAt}`;
    if (completionSyncKey === nextSyncKey) return;

    setCompletionSyncStatus("syncing");
    httpCourseLearningRecordRepository
      .submitCompletion(
        course.id,
        {
          learningPathTitle: completionLearningPath.title,
          learningPathLabel: completionLearningPath.label,
          practiceDraftedCount: completionPracticeSummary.draftedCount,
          practiceCompletedCount: completionPracticeSummary.completedCount,
        },
        remoteUserId
      )
      .then(() => {
        setCompletionSyncKey(nextSyncKey);
        setCompletionSyncStatus("synced");
      })
      .catch(() => {
        setCompletionSyncStatus("failed");
      });
  }, [
    canLearn,
    completionLearningPath,
    completionPracticeSummary,
    completionSyncKey,
    course,
    progress,
    remoteUserId,
  ]);

  if (!course && isLoading) return <LoadingLearningPage />;
  if (!course) return <NotFound />;
  if (!access) return <NotFound />;

  if (!canLearn) {
    return (
      <LockedLearningPage
        course={course}
        access={access}
        onBackToDetail={() => navigate(`/courses/${course.id}`)}
        onGoCourses={() => navigate("/courses")}
      />
    );
  }

  const session = createCourseLearningSession(course, progress);
  const learningPath = getLearningPathForCourse(course);
  const nextPathCourses = getNextCoursesInLearningPath(allCourses, course, 3);
  const nextCourse = nextPathCourses[0];
  const totalDuration = course.chapters.reduce(
    (sum, chapter) => sum + chapter.durationMinutes,
    0
  );
  const currentStep = session.chapterItems.find(
    item => item.chapter.id === session.currentChapter.id
  );
  const activeChapter =
    course.chapters.find(chapter => chapter.id === activeChapterId) ??
    session.currentChapter;
  const activeChapterStep =
    session.chapterItems.find(item => item.chapter.id === activeChapter.id) ??
    currentStep;
  const activePracticeRecord = getRecord(course.id, activeChapter.id);
  const activeMaterial = materialForChapter(course, activeChapter);
  const practiceSummary = getSummary(course);
  const currentIndex = session.chapterItems.findIndex(item => item.isCurrent);
  const nextOrderedChapter =
    currentIndex >= 0
      ? session.chapterItems[currentIndex + 1]?.chapter
      : undefined;
  const currentChapterCompleted = currentStep?.isCompleted ?? false;
  const completionFeedback = createCourseCompletionFeedback({
    course,
    session,
    practiceSummary,
    learningPath,
    progress,
    nextCourse,
  });

  const getNextIncompleteChapterAfter = (chapterId: string) => {
    const completedIds = new Set(progress?.completedChapterIds ?? []);
    completedIds.add(chapterId);
    return course.chapters.find(chapter => !completedIds.has(chapter.id));
  };

  const handleCompleteChapter = (
    chapter: CourseChapter,
    isCompleted: boolean
  ) => {
    if (isCompleted) {
      toast("章节已完成", {
        description: `「${chapter.title}」已经在学习记录中。`,
      });
      return;
    }

    const practiceRecord = getRecord(course.id, chapter.id);
    completeChapter(course.id, chapter.id, session.totalChapters);
    const completedAfter = session.completedCount + 1;
    const isCourseDone = completedAfter >= session.totalChapters;
    const nextIncompleteChapter = getNextIncompleteChapterAfter(chapter.id);
    if (activeChapter.id === chapter.id && nextIncompleteChapter) {
      setActiveChapterId(nextIncompleteChapter.id);
    }
    toast(isCourseDone ? "课程已完成" : "已记录章节进度", {
      description: isCourseDone
        ? practiceRecord?.isPracticeCompleted
          ? "本章练习已完成，可以回到成长空间查看记录。"
          : "章节已完成，右侧仍可补齐练习记录。"
        : practiceRecord?.isPracticeCompleted
          ? "下一章会自动成为当前学习目标。"
          : "下一章会自动成为当前学习目标，练习记录可稍后补齐。",
    });
  };

  const handleSavePracticeDraft = () => {
    saveDraft(course.id, activeChapter.id, practiceDraft);
    toast(practiceDraft.trim() ? "练习草稿已保存" : "练习草稿已清空", {
      description: `「${activeChapter.title}」的练习记录已保存在本机。`,
    });
  };

  const handleTogglePracticeCompleted = (isPracticeCompleted: boolean) => {
    setPracticeCompleted(course.id, activeChapter.id, isPracticeCompleted);
    toast(isPracticeCompleted ? "练习已标记完成" : "已取消练习完成", {
      description: `「${activeChapter.title}」的练习状态已更新。`,
    });
  };

  const handleReviewCourse = () => {
    const firstChapter = course.chapters[0];
    if (firstChapter) setActiveChapterId(firstChapter.id);

    window.requestAnimationFrame(() => {
      document
        .getElementById("course-learning-workspace")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
      <AppHeader />

      <main>
        <section className="relative overflow-hidden bg-[#243B35] text-white">
          <img
            src={course.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-24"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#14231F] via-[#243B35]/92 to-[#243B35]/72" />

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto grid max-w-[1220px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_360px] lg:px-10 lg:py-16"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/me/courses")}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/18 px-4 text-xs font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  成长空间
                </button>
                <button
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/18 px-4 text-xs font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                >
                  课程详情
                </button>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#DDE8D9] px-3 py-1 text-xs font-semibold text-[#243B35]">
                  {learningPath.label}
                </span>
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/78">
                  {course.category}
                </span>
                {isAccessSyncing && (
                  <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/62">
                    权益同步中
                  </span>
                )}
              </div>

              <h1 className="mt-5 max-w-[760px] break-words text-4xl font-semibold leading-tight sm:text-5xl">
                {course.title}
              </h1>
              <p className="mt-5 max-w-[680px] text-base leading-7 text-[#DDE8D9] sm:text-lg">
                {learningPath.title} · 当前章：{session.currentChapter.title}
              </p>

              <div className="mt-8 grid max-w-[780px] grid-cols-2 gap-4 sm:grid-cols-4">
                <LearningStat
                  icon={ListChecks}
                  label="已完成"
                  value={`${session.completedCount}/${session.totalChapters}`}
                />
                <LearningStat
                  icon={Trophy}
                  label="总进度"
                  value={`${session.progressPercent}%`}
                />
                <LearningStat
                  icon={Clock3}
                  label="预计时长"
                  value={formatDuration(totalDuration)}
                />
                <LearningStat
                  icon={ShieldCheck}
                  label="学习记录"
                  value={learningRecordLabel}
                />
              </div>
            </div>

            <aside className="self-end rounded-[28px] border border-white/14 bg-[#FFFDF8] p-5 text-[#243B35] shadow-2xl shadow-black/20">
              <p className="text-xs font-semibold text-[#6F8F83]">当前章节</p>
              <h2 className="mt-3 break-words text-2xl font-semibold leading-snug">
                {session.currentChapter.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#6D746F]">
                {session.currentChapter.description}
              </p>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#ECE5DB]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${session.progressPercent}%` }}
                  transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full bg-[#6F8F83]"
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#7B817C]">
                {session.isCompleted
                  ? "全部章节已完成，可以复习，也可以进入同路径下一门课程。"
                  : nextOrderedChapter
                    ? `完成本章后，下一章是「${nextOrderedChapter.title}」。`
                    : "完成本章后，这门课程就进入已完成状态。"}
              </p>

              <button
                onClick={() =>
                  session.isCompleted
                    ? navigate("/me/courses")
                    : handleCompleteChapter(
                        session.currentChapter,
                        currentChapterCompleted
                      )
                }
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#243B35] text-sm font-semibold text-white transition hover:bg-[#315047]"
              >
                {session.isCompleted ? (
                  <Trophy className="mr-2 h-4 w-4" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                {session.isCompleted ? "回到成长空间" : "标记本章完成"}
              </button>
              {nextCourse && (
                <button
                  onClick={() => navigate(`/courses/${nextCourse.id}/learn`)}
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full border border-[#D8CEC0] text-sm font-semibold text-[#41675A] transition hover:bg-[#EEF4EA]"
                >
                  同路径下一课
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              )}
            </aside>
          </motion.div>
        </section>

        <section
          id="course-learning-workspace"
          className="px-5 py-10 sm:px-8 lg:px-10"
        >
          <div className="mx-auto grid max-w-[1220px] gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 self-start rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5 sm:p-6">
              <div className="flex flex-col gap-3 border-b border-[#E7DED0] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
                    <BookOpenCheck className="h-4 w-4" />
                    章节进度
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#243B35]">
                    按章节推进，完成后自动切到下一步
                  </h2>
                </div>
                <span className="w-fit rounded-full bg-[#F4EFE6] px-3 py-1 text-xs font-semibold text-[#6D746F]">
                  {session.progressPercent}%
                </span>
              </div>

              <div className="mt-2">
                {syncError && (
                  <p className="mb-4 rounded-[18px] bg-[#FFF5EF] px-4 py-3 text-xs leading-5 text-[#A65F48]">
                    服务端学习记录暂未同步：{syncError}
                    。本机记录已保留，稍后可继续同步。
                  </p>
                )}
                {session.chapterItems.map(item => (
                  <ChapterRow
                    key={item.chapter.id}
                    chapter={item.chapter}
                    stepNumber={item.stepNumber}
                    isCompleted={item.isCompleted}
                    isCurrent={item.isCurrent}
                    isActive={item.chapter.id === activeChapter.id}
                    hasPracticeDraft={Boolean(
                      getRecord(course.id, item.chapter.id)?.note.trim()
                    )}
                    isPracticeCompleted={Boolean(
                      getRecord(course.id, item.chapter.id)?.isPracticeCompleted
                    )}
                    onSelect={() => setActiveChapterId(item.chapter.id)}
                    onComplete={() =>
                      handleCompleteChapter(item.chapter, item.isCompleted)
                    }
                  />
                ))}
              </div>
            </div>

            <aside className="space-y-6">
              <PracticeWorkspacePanel
                chapter={activeChapter}
                stepNumber={activeChapterStep?.stepNumber ?? 1}
                material={activeMaterial}
                record={activePracticeRecord}
                summary={practiceSummary}
                draft={practiceDraft}
                onDraftChange={setPracticeDraft}
                onSaveDraft={handleSavePracticeDraft}
                onToggleCompleted={handleTogglePracticeCompleted}
              />

              <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
                  <HeartHandshake className="h-4 w-4" />
                  支持路径
                </p>
                <p className="mt-4 text-sm leading-6 text-[#6D746F]">
                  {course.supportPath}
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <button
                    onClick={() => navigate("/assessment")}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[#D8CEC0] text-xs font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6]"
                  >
                    做一次测评
                  </button>
                  <button
                    onClick={() => navigate("/consulting")}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#243B35] text-xs font-semibold text-white transition hover:bg-[#315047]"
                  >
                    预约咨询支持
                  </button>
                </div>
              </div>

              {nextCourse && (
                <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
                    <Route className="h-4 w-4" />
                    下一门建议
                  </p>
                  <NextCoursePreview
                    course={nextCourse}
                    onOpen={() => navigate(`/courses/${nextCourse.id}`)}
                  />
                </div>
              )}
            </aside>
          </div>
        </section>

        {completionFeedback && (
          <CourseCompletionFeedbackPanel
            feedback={completionFeedback}
            onGoGrowth={() => navigate("/me/courses")}
            onOpenNextCourse={() =>
              completionFeedback.nextStep.course
                ? navigate(
                    `/courses/${completionFeedback.nextStep.course.id}/learn`
                  )
                : navigate("/me/courses")
            }
            onReviewCourse={handleReviewCourse}
          />
        )}

        <section className="px-5 pb-16 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-[1220px]">
            <div className="grid gap-4 md:grid-cols-3">
              <SupportTile
                icon={Compass}
                title={learningPath.title}
                description={learningPath.description}
              />
              <SupportTile
                icon={Route}
                title="学习节奏"
                description={`${learningPath.paceLabel}，预计 ${learningPath.durationLabel} 完成当前路径。`}
              />
              <SupportTile
                icon={ShieldCheck}
                title="路径目标"
                description={learningPath.outcome}
              />
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
