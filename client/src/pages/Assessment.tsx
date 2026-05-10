import { useMemo, useState, type ElementType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import {
  useQuickAssessment,
  type AssessmentDimension,
  type AssessmentQuestion,
  type Recommendation,
} from "@/features/assessments";

const dimensionCopy = {
  emotion: { label: "情绪", color: "bg-[#A65F48]" },
  sleep: { label: "睡眠", color: "bg-[#6F8F83]" },
  relationship: { label: "关系", color: "bg-[#8B6F46]" },
  parent_child: { label: "亲子", color: "bg-[#7F8A9A]" },
  workplace: { label: "职场", color: "bg-[#B08B63]" },
  self_growth: { label: "成长", color: "bg-[#4F7068]" },
  risk: { label: "风险", color: "bg-[#B86F56]" },
} satisfies Record<AssessmentDimension, { label: string; color: string }>;

const riskLevelCopy = {
  low: {
    label: "低风险",
    tone: "bg-[#E6EDDF] text-[#41675A]",
  },
  medium: {
    label: "需要关注",
    tone: "bg-[#F2E6C9] text-[#81652C]",
  },
  high: {
    label: "建议咨询",
    tone: "bg-[#F4E5DE] text-[#A65F48]",
  },
  urgent: {
    label: "优先求助",
    tone: "bg-[#F9DDD5] text-[#963F2D]",
  },
} as const;

const scaleOptions = [
  { value: 0, label: "几乎没有" },
  { value: 1, label: "偶尔" },
  { value: 2, label: "有时" },
  { value: 3, label: "经常" },
  { value: 4, label: "非常明显" },
];

function QuestionOption({
  option,
  selected,
  onSelect,
}: {
  option: (typeof scaleOptions)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group flex min-h-[72px] items-center justify-between rounded-[22px] border px-5 text-left transition ${
        selected
          ? "border-[#6F8F83] bg-[#E6EDDF] text-[#243B35]"
          : "border-[#E4DCCF] bg-[#FFFDF8] text-[#5F6B64] hover:border-[#BFD0B8] hover:bg-white"
      }`}
    >
      <span className="text-sm font-semibold">{option.label}</span>
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
          selected
            ? "bg-[#243B35] text-white"
            : "bg-[#F2ECE2] text-[#8A918B] group-hover:bg-[#E6EDDF]"
        }`}
      >
        {option.value}
      </span>
    </button>
  );
}

function StatusPill({ icon, label }: { icon: ElementType; label: string }) {
  const Icon = icon;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/14 px-3 py-1 text-xs font-semibold text-white/78">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function RecommendationAction({
  recommendation,
  onCourseOpen,
}: {
  recommendation: Recommendation;
  onCourseOpen: (courseId: string) => void;
}) {
  if (recommendation.target === "course" && recommendation.targetId) {
    return (
      <button
        onClick={() => onCourseOpen(recommendation.targetId!)}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#243B35] px-4 text-xs font-semibold text-white transition hover:bg-[#315047]"
      >
        查看课程
        <ArrowRight className="ml-2 h-3.5 w-3.5" />
      </button>
    );
  }

  if (recommendation.target === "counseling") {
    return (
      <button className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-[#D8CEC0] px-4 text-xs font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6]">
        咨询入口筹备中
      </button>
    );
  }

  return null;
}

function QuestionPanel({
  question,
  selectedValue,
  currentIndex,
  total,
  onAnswer,
}: {
  question: AssessmentQuestion;
  selectedValue: unknown;
  currentIndex: number;
  total: number;
  onAnswer: (value: number) => void;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-sm font-semibold text-[#6F8F83]">
          第 {currentIndex + 1} 题 / 共 {total} 题
        </p>
        <h1 className="mt-4 max-w-[760px] text-3xl font-semibold leading-snug text-[#243B35] sm:text-4xl">
          {question.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#6D746F]">
          请选择最接近最近一周真实状态的程度，答案只用于生成本次支持建议。
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-5">
          {scaleOptions.map(option => (
            <QuestionOption
              key={option.value}
              option={option}
              selected={selectedValue === option.value}
              onSelect={() => onAnswer(option.value)}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Assessment() {
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const {
    flow,
    answersByQuestionId,
    answeredCount,
    isComplete,
    result,
    isLoading,
    isSubmitting,
    error,
    setAnswer,
    submit,
    reset,
  } = useQuickAssessment();

  const currentQuestion = flow?.questions[currentIndex];
  const progressPercent = flow
    ? Math.round((answeredCount / flow.questions.length) * 100)
    : 0;
  const dimensionEntries = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.report.dimensions) as Array<
      [AssessmentDimension, number]
    >;
  }, [result]);

  const handleAnswer = (value: number) => {
    if (!currentQuestion || !flow) return;
    setAnswer(currentQuestion.id, value);
    if (currentIndex < flow.questions.length - 1) {
      window.setTimeout(() => setCurrentIndex(index => index + 1), 140);
    }
  };

  const handleSubmit = () => {
    void submit();
  };

  const handleReset = () => {
    reset();
    setCurrentIndex(0);
  };

  return (
    <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
      <AppHeader />

      <main className="mx-auto max-w-[1220px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <section className="rounded-[32px] bg-[#243B35] p-6 text-white shadow-xl shadow-[#243B35]/10 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-wrap gap-2">
                <StatusPill icon={ShieldCheck} label="不生成诊断" />
                <StatusPill icon={ClipboardList} label="4 分钟" />
                <StatusPill icon={Sparkles} label="生成推荐路径" />
              </div>
              <h1 className="mt-7 text-3xl font-semibold tracking-normal sm:text-4xl lg:text-5xl">
                心理状态快速评估
              </h1>
              <p className="mt-4 max-w-[700px] text-sm leading-7 text-white/72">
                从情绪、睡眠、关系、亲子、职场和自我成长六个维度理解最近状态，再给出适合的课程或支持建议。
              </p>
            </motion.div>

            <div className="rounded-[28px] border border-white/12 bg-white/8 p-5">
              <p className="text-sm font-semibold text-[#DDE8D9]">完成进度</p>
              <div className="mt-5 flex items-end justify-between">
                <span className="text-4xl font-semibold">
                  {progressPercent}%
                </span>
                <span className="text-xs text-white/62">
                  {answeredCount} / {flow?.questions.length ?? 0}
                </span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/14">
                <motion.span
                  className="block h-full rounded-full bg-[#DDE8D9]"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-[20px] border border-[#F0D6C9] bg-[#FFF5EF] px-5 py-4 text-sm text-[#A65F48]">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5 sm:p-6 lg:p-8">
            {isLoading ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#6F8F83]" />
                  <p className="mt-4 text-sm font-semibold text-[#5F6B64]">
                    正在同步测评题目
                  </p>
                </div>
              </div>
            ) : flow && currentQuestion ? (
              <>
                <QuestionPanel
                  question={currentQuestion}
                  selectedValue={answersByQuestionId[currentQuestion.id]}
                  currentIndex={currentIndex}
                  total={flow.questions.length}
                  onAnswer={handleAnswer}
                />

                <div className="mt-8 flex flex-col gap-3 border-t border-[#E7DED0] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setCurrentIndex(index => Math.max(0, index - 1))
                      }
                      disabled={currentIndex === 0}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#D8CEC0] px-4 text-sm font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      上一题
                    </button>
                    <button
                      onClick={() =>
                        setCurrentIndex(index =>
                          Math.min(flow.questions.length - 1, index + 1)
                        )
                      }
                      disabled={currentIndex === flow.questions.length - 1}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#D8CEC0] px-4 text-sm font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      下一题
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!isComplete || isSubmitting}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#243B35] px-5 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:bg-[#9AA19B]"
                  >
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    生成报告
                  </button>
                </div>
              </>
            ) : (
              <div className="min-h-[360px] rounded-[24px] border border-dashed border-[#D8CEC0] bg-[#FFFDF8] p-8 text-center">
                <p className="text-sm font-semibold text-[#A65F48]">
                  测评暂不可用
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">
                    状态速览
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                    当前答题记录
                  </h2>
                </div>
                <BarChart3 className="h-5 w-5 text-[#A65F48]" />
              </div>

              <div className="mt-6 space-y-3">
                {flow?.questions.map((question, index) => {
                  const answered =
                    answersByQuestionId[question.id] !== undefined;
                  return (
                    <button
                      key={question.id}
                      onClick={() => setCurrentIndex(index)}
                      className={`flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left text-sm transition ${
                        currentIndex === index
                          ? "bg-[#E6EDDF] text-[#243B35]"
                          : "bg-[#F5EFE5] text-[#667069] hover:bg-[#F0E8DC]"
                      }`}
                    >
                      <span className="truncate">
                        {dimensionCopy[question.dimension].label}
                      </span>
                      {answered ? (
                        <CheckCircle2 className="h-4 w-4 text-[#6F8F83]" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-[#D6CABC]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] p-6 shadow-sm shadow-[#243B35]/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#6F8F83]">
                        测评报告
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-[#243B35]">
                        初步支持建议
                      </h2>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        riskLevelCopy[result.report.riskLevel].tone
                      }`}
                    >
                      {riskLevelCopy[result.report.riskLevel].label}
                    </span>
                  </div>

                  {result.riskEvent && (
                    <div className="mt-5 rounded-[20px] border border-[#F0D6C9] bg-[#FFF5EF] p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#A65F48]" />
                        <p className="text-sm leading-6 text-[#884A38]">
                          请优先联系身边可信任的人，或使用当地紧急服务获得即时支持。
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="mt-5 text-sm leading-7 text-[#5F6B64]">
                    {result.report.summary}
                  </p>

                  <div className="mt-6 space-y-3">
                    {dimensionEntries.map(([dimension, score]) => (
                      <div key={dimension}>
                        <div className="flex items-center justify-between text-xs font-semibold text-[#667069]">
                          <span>{dimensionCopy[dimension].label}</span>
                          <span>{score}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ECE5DB]">
                          <span
                            className={`block h-full rounded-full ${dimensionCopy[dimension].color}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 space-y-4 border-t border-[#E7DED0] pt-5">
                    {result.report.recommendations.map(recommendation => (
                      <div
                        key={`${recommendation.target}-${recommendation.title}`}
                        className="rounded-[20px] bg-[#F5EFE5] p-4"
                      >
                        <p className="text-sm font-semibold text-[#243B35]">
                          {recommendation.title}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-[#6D746F]">
                          {recommendation.reason}
                        </p>
                        <RecommendationAction
                          recommendation={recommendation}
                          onCourseOpen={courseId =>
                            navigate(`/courses/${courseId}`)
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleReset}
                    className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-full border border-[#D8CEC0] text-xs font-semibold text-[#4F5B54] transition hover:bg-[#F4EFE6]"
                  >
                    <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                    重新评估
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {!result && (
              <div className="rounded-[28px] border border-[#E4DCCF] bg-[#F5EFE5] p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#243B35] text-white">
                    <HeartHandshake className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#243B35]">
                      下一步
                    </p>
                    <p className="mt-1 text-xs text-[#767F78]">
                      报告会给出课程或支持建议
                    </p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-[#5F6B64]">
                  本测评只用于整理支持路径，不能替代专业诊断。若你正处在即时危险中，请先获得现实中的帮助。
                </p>
              </div>
            )}
          </aside>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
