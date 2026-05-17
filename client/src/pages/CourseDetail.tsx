import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Crown,
  FileText,
  Heart,
  HeartHandshake,
  Lock,
  MessageCircle,
  PlayCircle,
  ReceiptText,
  Route,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import CourseCheckoutDrawer, {
  formatCheckoutDateTime,
  type CourseCheckoutStatus,
} from "@/components/CourseCheckoutDrawer";
import CoursePendingCheckoutBanner from "@/components/CoursePendingCheckoutBanner";
import NotFound from "@/pages/NotFound";
import {
  buildCourseTrustProfile,
  createCourseTrustSummary,
  createCourseCheckoutSummary,
  createPendingCheckoutPromptForCourse,
  findPendingCourseCheckoutOrder,
  formatCheckoutMoney,
  getCourseAccessDescription,
  getCourseDetailPrimaryActionCopy,
  getLearningPathForCourse,
  getNextCoursesInLearningPath,
  useCourseAccess,
  useCourseDetail,
  useCourseEngagement,
  type Course,
  type CourseAccessStatus,
  type CourseCheckoutMode,
  type CourseCheckoutOrderResult,
  type CourseCheckoutPaymentChannel,
  type CoursePendingCheckoutPrompt,
  type CourseTrustProfile,
} from "@/features/courses";

function formatLearners(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatPrice(course: Course): string {
  return course.isFree ? "免费" : formatCheckoutMoney(course.price);
}

const accessCopy = {
  free: "免费学习",
  owned: "已解锁",
  member_included: "会员权益",
  requires_purchase: "需购买",
  requires_membership: "会员可学",
} satisfies Record<CourseAccessStatus, string>;

const actionIcon = {
  play: PlayCircle,
  crown: Crown,
  shoppingBag: ShoppingBag,
};

export default function CourseDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/courses/:courseId");
  const {
    accessState,
    cancelCheckoutOrder,
    createCheckoutOrder,
    getCourseAccess,
    hasActiveMembership,
    isSyncing,
    payCheckoutOrder,
  } = useCourseAccess();
  const {
    getProgress,
    getProgressPercent,
    isFavorited,
    startCourse,
    toggleFavorite,
  } = useCourseEngagement();
  const [checkoutMode, setCheckoutMode] = useState<
    CourseCheckoutMode | undefined
  >();
  const [selectedPaymentChannel, setSelectedPaymentChannel] =
    useState<CourseCheckoutPaymentChannel>("wechat_pay");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [checkoutStatus, setCheckoutStatus] =
    useState<CourseCheckoutStatus>("idle");
  const [checkoutOrder, setCheckoutOrder] = useState<
    CourseCheckoutOrderResult | undefined
  >();
  const [checkoutError, setCheckoutError] = useState<string | undefined>();
  const [checkoutIntentHandled, setCheckoutIntentHandled] = useState(false);
  const courseId = Number(params?.courseId);
  const { course, allCourses, relatedCourses, isLoading } = useCourseDetail(
    Number.isInteger(courseId) ? courseId : undefined
  );

  if (!course && isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
        <AppHeader />
        <main className="flex min-h-[520px] items-center justify-center px-5">
          <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] px-8 py-7 text-center shadow-sm">
            <p className="text-sm font-semibold text-[#6F8F83]">
              正在同步课程内容
            </p>
            <p className="mt-3 text-xs text-[#7B817C]">
              请稍候，马上进入课程详情。
            </p>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!course) return <NotFound />;

  const totalDuration = course.chapters.reduce(
    (sum, chapter) => sum + chapter.durationMinutes,
    0
  );
  const totalLessons = course.chapters.reduce(
    (sum, chapter) => sum + chapter.lessonCount,
    0
  );
  const progress = getProgress(course.id);
  const progressPercent = getProgressPercent(course.id, course.chapters.length);
  const hasStarted = Boolean(progress);
  const favorite = isFavorited(course.id);
  const access = getCourseAccess(course);
  const learningPath = getLearningPathForCourse(course);
  const nextPathCourses = getNextCoursesInLearningPath(allCourses, course, 3);
  const supplementalCourses = relatedCourses
    .filter(
      relatedCourse =>
        !nextPathCourses.some(pathCourse => pathCourse.id === relatedCourse.id)
    )
    .slice(0, 3);
  const primaryAction = getCourseDetailPrimaryActionCopy(access, hasStarted);
  const pathPosition = learningPath.courseIds.indexOf(course.id);
  const pathStepLabel =
    pathPosition >= 0
      ? `第 ${pathPosition + 1} / ${learningPath.courseIds.length} 门`
      : "路径补充课程";
  const locked = !access.canStart;
  const visibleProgressPercent = access.canStart ? progressPercent : 0;
  const visibleLearningStatus = locked
    ? "待解锁"
    : hasStarted
      ? progress?.status === "completed"
        ? "已完成"
        : "学习中"
      : "未开始";
  const checkoutSummary = checkoutMode
    ? createCourseCheckoutSummary(course, checkoutMode)
    : undefined;
  const trustProfile = buildCourseTrustProfile(course);
  const trustSummary = createCourseTrustSummary(course);
  const pendingCheckoutMode: CourseCheckoutMode =
    access.status === "requires_membership" ? "membership" : "course";
  const pendingCheckoutPrompt = !access.canStart
    ? createPendingCheckoutPromptForCourse(
        accessState,
        course,
        pendingCheckoutMode
      )
    : undefined;
  const effectivePrimaryActionLabel = pendingCheckoutPrompt
    ? "继续支付"
    : primaryAction.label;
  const effectivePrimaryActionDescription = pendingCheckoutPrompt
    ? `这笔订单已保留到 ${formatCheckoutDateTime(
        pendingCheckoutPrompt.checkout.payment.expiresAt
      )}。`
    : primaryAction.description;
  const EffectivePrimaryActionIcon = pendingCheckoutPrompt
    ? ReceiptText
    : actionIcon[primaryAction.icon];

  const handleStartLearning = () => {
    if (!access.canStart) {
      toast("请先解锁课程", {
        description: getCourseAccessDescription(access.status),
      });
      return;
    }

    startCourse(course.id);
    toast(hasStarted ? "继续学习" : "已加入学习计划", {
      description: hasStarted
        ? "即将进入学习页，继续当前章节。"
        : "课程已放入成长空间，即将进入第一章。",
    });
    navigate(`/courses/${course.id}/learn`);
  };

  const handleToggleFavorite = () => {
    toggleFavorite(course.id);
    toast(favorite ? "已取消收藏" : "已收藏课程", {
      description: favorite
        ? `「${course.title}」已从收藏夹移除。`
        : `「${course.title}」已加入你的成长清单。`,
    });
  };

  const openCheckout = (mode: CourseCheckoutMode) => {
    const pendingCheckout = findPendingCourseCheckoutOrder(
      accessState,
      course,
      mode
    );

    setCheckoutMode(mode);
    setCheckoutStatus(pendingCheckout ? "pending_payment" : "idle");
    setAcceptedTerms(false);
    setSelectedPaymentChannel("wechat_pay");
    setCheckoutOrder(pendingCheckout);
    setCheckoutError(undefined);
  };

  useEffect(() => {
    if (checkoutIntentHandled) return;

    const rawMode = new URLSearchParams(window.location.search).get("checkout");
    if (rawMode !== "course" && rawMode !== "membership") return;

    setCheckoutIntentHandled(true);
    window.history.replaceState(null, "", `/courses/${course.id}`);

    if (access.canStart) return;

    const requestedMode: CourseCheckoutMode =
      rawMode === "membership" && access.canActivateMembership
        ? "membership"
        : "course";

    if (requestedMode === "membership" && access.canActivateMembership) {
      openCheckout("membership");
      return;
    }

    if (requestedMode === "course" && access.canPurchase) {
      openCheckout("course");
    }
  }, [
    access.canActivateMembership,
    access.canPurchase,
    access.canStart,
    checkoutIntentHandled,
    course.id,
  ]);

  const closeCheckout = () => {
    setCheckoutMode(undefined);
    setCheckoutStatus("idle");
    setAcceptedTerms(false);
    setCheckoutOrder(undefined);
    setCheckoutError(undefined);
  };

  const handlePrimaryAction = () => {
    if (access.canStart) {
      handleStartLearning();
      return;
    }

    openCheckout(
      access.status === "requires_membership" ? "membership" : "course"
    );
  };

  const handleConfirmCheckout = () => {
    if (!checkoutMode) return;
    if (!acceptedTerms) {
      toast("请先确认购买须知", {
        description: "确认订单金额、权益交付和开发期支付说明后再继续。",
      });
      return;
    }

    setCheckoutError(undefined);
    void (async () => {
      let pendingCheckout = checkoutOrder;
      if (pendingCheckout?.order.status !== "pending_payment") {
        setCheckoutStatus("creating");
        const created = await createCheckoutOrder(course, checkoutMode);
        if (created === "auth_required") {
          setCheckoutStatus("idle");
          toast("请先登录", {
            description: "登录后即可创建订单，并同步学习权益。",
          });
          return;
        }

        pendingCheckout = created.checkout;
        setCheckoutOrder(created.checkout);
        setCheckoutStatus("pending_payment");
      }

      setCheckoutStatus("processing");
      const paid = await payCheckoutOrder(
        pendingCheckout.order.id,
        selectedPaymentChannel
      );
      if (paid === "auth_required") {
        setCheckoutStatus("idle");
        toast("请先登录", {
          description: "登录后即可继续支付这笔订单。",
        });
        return;
      }

      setCheckoutOrder(paid.checkout);
      setCheckoutStatus("success");
      toast(checkoutMode === "membership" ? "会员已开通" : "课程已解锁", {
        description:
          paid.syncMode === "api"
            ? "支付成功，权益已同步到账户。"
            : "支付结果已先保存在本机，网络恢复后可再同步。",
      });
    })().catch(err => {
      setCheckoutStatus("failed");
      setCheckoutError(err instanceof Error ? err.message : "支付确认失败");
      toast("支付未完成", {
        description: "订单仍保留为待支付，可以稍后继续支付或取消。",
      });
    });
  };

  const handleCancelCheckoutOrder = () => {
    if (!checkoutOrder || checkoutOrder.order.status !== "pending_payment") {
      closeCheckout();
      return;
    }

    setCheckoutError(undefined);
    setCheckoutStatus("processing");
    void cancelCheckoutOrder(checkoutOrder.order.id)
      .then(result => {
        if (result === "auth_required") {
          setCheckoutStatus("pending_payment");
          toast("请先登录", {
            description: "登录后可继续处理这笔待支付订单。",
          });
          return;
        }

        setCheckoutOrder(result.checkout);
        setCheckoutStatus("failed");
        toast("订单已取消", {
          description: "课程权益未发放，你可以重新下单。",
        });
      })
      .catch(err => {
        setCheckoutStatus("failed");
        setCheckoutError(err instanceof Error ? err.message : "订单取消失败");
      });
  };

  const handleCancelPendingCheckout = (prompt: CoursePendingCheckoutPrompt) => {
    setCheckoutError(undefined);
    void cancelCheckoutOrder(prompt.checkout.order.id)
      .then(result => {
        if (result === "auth_required") {
          toast("请先登录", {
            description: "登录后可继续处理这笔待支付订单。",
          });
          return;
        }

        if (checkoutOrder?.order.id === prompt.checkout.order.id) {
          setCheckoutOrder(result.checkout);
          setCheckoutStatus("failed");
        }

        toast("订单已取消", {
          description: "课程权益未发放，你可以重新下单。",
        });
      })
      .catch(err => {
        toast("订单取消失败", {
          description: err instanceof Error ? err.message : "请稍后再试。",
        });
      });
  };

  const handleStartAfterCheckout = () => {
    closeCheckout();
    startCourse(course.id);
    navigate(`/courses/${course.id}/learn`);
  };

  return (
    <div className="min-h-screen bg-[#F9F5EE] pb-24 text-[#243B35] lg:pb-0">
      <AppHeader />

      <main>
        <section className="relative overflow-hidden bg-[#243B35] text-white">
          <img
            src={course.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-34"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#13211D] via-[#243B35]/90 to-[#243B35]/54" />

          <div className="relative mx-auto grid max-w-[1240px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-12 lg:py-18">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-0"
            >
              <button
                onClick={() => navigate("/courses")}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                返回课程中心
              </button>

              <div className="mt-10 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#DDE8D9] px-3 py-1 text-xs font-semibold text-[#243B35]">
                  {course.category}
                </span>
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/82">
                  {course.type}
                </span>
                {course.isVip && (
                  <span className="rounded-full bg-[#C4A46A] px-3 py-1 text-xs font-semibold text-[#243B35]">
                    会员内容
                  </span>
                )}
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/82">
                  {learningPath.label}
                </span>
              </div>

              <h1 className="mt-5 max-w-[760px] text-4xl font-semibold leading-tight sm:text-5xl">
                {course.title}
              </h1>
              <p className="mt-5 max-w-[680px] text-xl leading-8 text-[#DDE8D9]">
                {course.subtitle}
              </p>
              <p className="mt-5 max-w-[720px] text-sm leading-7 text-white/68">
                {course.summary}
              </p>

              <button
                onClick={() =>
                  document
                    .getElementById("learning-path")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="mt-6 inline-flex max-w-full items-center rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-[#DDE8D9] transition hover:bg-white/18"
              >
                <Route className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">所属路径：{learningPath.title}</span>
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
              </button>

              <div className="mt-9 grid max-w-[760px] grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric
                  icon={Users}
                  value={formatLearners(course.learners)}
                  label="学习人数"
                />
                <Metric
                  icon={BookOpen}
                  value={`${totalLessons} 节`}
                  label="课程内容"
                />
                <Metric
                  icon={Clock3}
                  value={`${totalDuration} 分钟`}
                  label="预计时长"
                />
                <Metric
                  icon={CalendarCheck}
                  value={course.teacher}
                  label="主讲老师"
                />
              </div>
            </motion.div>

            <CommercePanel
              accessLabel={accessCopy[access.status]}
              course={course}
              favorite={favorite}
              hasActiveMembership={hasActiveMembership}
              isSyncing={isSyncing}
              locked={locked}
              primaryActionLabel={effectivePrimaryActionLabel}
              primaryActionDescription={effectivePrimaryActionDescription}
              PrimaryActionIcon={EffectivePrimaryActionIcon}
              trustProfile={trustProfile}
              trustSummary={trustSummary}
              visibleLearningStatus={visibleLearningStatus}
              visibleProgressPercent={visibleProgressPercent}
              onActivateMembership={() => openCheckout("membership")}
              onOpenCourseCheckout={() => openCheckout("course")}
              onPrimaryAction={handlePrimaryAction}
              onToggleFavorite={handleToggleFavorite}
              onConsult={() => navigate("/consulting")}
            />
          </div>
        </section>

        {pendingCheckoutPrompt && (
          <CoursePendingCheckoutBanner
            title="这门课有待支付订单"
            description="订单已保留支付窗口，可以继续支付或取消后重新选择。"
            prompts={[pendingCheckoutPrompt]}
            onResume={prompt => openCheckout(prompt.mode)}
            onCancel={handleCancelPendingCheckout}
          />
        )}

        <section className="bg-[#FFFDF8] px-5 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-[1200px] gap-4 md:grid-cols-4">
            <DeliveryFact
              icon={BookOpen}
              title="课程内容"
              description={`${course.chapters.length} 个阶段，${totalLessons} 节内容`}
            />
            <DeliveryFact
              icon={FileText}
              title="练习资料"
              description="章节讲义与课后练习记录"
            />
            <DeliveryFact
              icon={BadgeCheck}
              title="学习档案"
              description="完成后沉淀进成长空间"
            />
            <DeliveryFact
              icon={ShieldCheck}
              title="隐私保障"
              description="学习记录仅自己可见"
            />
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="text-sm font-semibold text-[#6F8F83]">是否适合你</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35]">
                先判断匹配度，再决定是否购买
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#6D746F]">
                心理成长内容不应该只追求“买下”，更重要的是当下状态是否适合、学完之后能不能落地。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {course.suitableFor.map(item => (
                <div
                  key={item.title}
                  className="rounded-[22px] border border-[#E4DCCF] bg-[#FFFDF8]/80 p-5"
                >
                  <Sparkles className="h-5 w-5 text-[#8C6E4A]" />
                  <h3 className="mt-4 text-lg font-semibold text-[#243B35]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#6D746F]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CourseTrustSection
          course={course}
          disabled={isSyncing}
          primaryActionLabel={
            isSyncing ? "同步中" : effectivePrimaryActionLabel
          }
          profile={trustProfile}
          summary={trustSummary}
          onConsult={() => navigate("/consulting")}
          onPrimaryAction={handlePrimaryAction}
        />

        <section
          id="learning-path"
          className="bg-[#FFFDF8] px-5 py-16 sm:px-8 lg:px-12"
        >
          <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="overflow-hidden rounded-[28px] border border-[#E4DCCF] bg-[#F9F5EE]">
              <img
                src={learningPath.imageUrl}
                alt=""
                className="h-72 w-full object-cover"
              />
              <div className="p-6">
                <p className="text-sm font-semibold text-[#6F8F83]">
                  所属学习路径
                </p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35]">
                  {learningPath.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[#6D746F]">
                  {learningPath.description}
                </p>

                <div className="mt-6 divide-y divide-[#E4DCCF] border-y border-[#E4DCCF]">
                  <PathFact label="路径位置" value={pathStepLabel} />
                  <PathFact label="建议节奏" value={learningPath.paceLabel} />
                  <PathFact
                    label="预计周期"
                    value={learningPath.durationLabel}
                  />
                </div>
              </div>
            </div>

            <div className="self-center">
              <p className="text-sm font-semibold text-[#6F8F83]">购买判断</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35]">
                买下这一课之前，先看清它会把你带到哪里
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#6D746F]">
                详情页优先回答“我为什么现在学这门课、学完以后接什么”，让用户从单课决策自然过渡到学习计划。
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {learningPath.focus.map(item => (
                  <span
                    key={item}
                    className="rounded-full bg-[#E6EDDF] px-3 py-1.5 text-xs font-semibold text-[#41675A]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 border-l border-[#C9D8C2] pl-5">
                <p className="text-sm font-semibold text-[#243B35]">
                  学完这一课，核心目标是
                </p>
                <p className="mt-3 text-sm leading-7 text-[#6D746F]">
                  {learningPath.outcome}
                </p>
              </div>

              {nextPathCourses.length > 0 && (
                <div className="mt-8 rounded-[24px] border border-[#E4DCCF] bg-[#F9F5EE] p-5">
                  <p className="text-xs font-semibold text-[#6F8F83]">
                    下一门建议课程
                  </p>
                  <button
                    onClick={() =>
                      navigate(`/courses/${nextPathCourses[0].id}`)
                    }
                    className="group mt-4 flex w-full items-center gap-4 text-left"
                  >
                    <img
                      src={nextPathCourses[0].coverUrl}
                      alt=""
                      className="h-20 w-24 shrink-0 rounded-[18px] object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold leading-snug text-[#243B35] group-hover:text-[#5F7F73]">
                        {nextPathCourses[0].title}
                      </span>
                      <span className="mt-2 block text-xs text-[#7B817C]">
                        {nextPathCourses[0].category} ·{" "}
                        {nextPathCourses[0].teacher}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#6F8F83]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-[#F3EDE4] px-5 py-16 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">
                    课程目录
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-[#243B35]">
                    购买前先看内容结构
                  </h2>
                </div>
                {access.canStart && (
                  <button
                    onClick={handleStartLearning}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
                  >
                    进入学习页
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-8 divide-y divide-[#E1D7C7] border-y border-[#E1D7C7]">
                {course.chapters.map((chapter, index) => (
                  <div
                    key={chapter.id}
                    className="grid gap-4 py-6 sm:grid-cols-[72px_1fr_auto]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DDE8D9] text-sm font-semibold text-[#243B35]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold text-[#243B35]">
                        {chapter.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#6D746F]">
                        {chapter.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#7B817C] sm:justify-end">
                      <span>{chapter.lessonCount} 节</span>
                      <span>{chapter.durationMinutes} 分钟</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 ${
                          access.canStart
                            ? "bg-[#DDE8D9] text-[#41675A]"
                            : "bg-[#F4E5DE] text-[#A65F48]"
                        }`}
                      >
                        {access.canStart ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                        {access.canStart ? "已解锁" : "购买后学习"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="self-start rounded-[28px] bg-[#243B35] p-7 text-white">
              <p className="text-sm font-semibold text-[#BFD0B8]">
                学完你会获得
              </p>
              <div className="mt-6 space-y-4">
                {course.outcomes.map(item => (
                  <p
                    key={item}
                    className="flex gap-3 text-sm leading-7 text-white/78"
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#BFD0B8]" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="mt-7 border-t border-white/14 pt-6">
                <p className="text-sm font-semibold text-white">推荐支持路径</p>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  {course.supportPath}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#FFFDF8] px-5 py-16 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold text-[#6F8F83]">权益与保障</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35]">
                购买前该知道的交付规则
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#6D746F]">
                课程交易不是一次性按钮，购买后会进入课程权益、学习记录和成长档案的连续流程。
              </p>
            </div>
            <div className="divide-y divide-[#E4DCCF] border-y border-[#E4DCCF]">
              <AssuranceRow
                icon={ReceiptText}
                title="订单与权益"
                description="支付确认后课程会写入你的课程权益，并出现在成长空间。"
              />
              <AssuranceRow
                icon={ShieldCheck}
                title="隐私边界"
                description="学习进度、练习记录和完成反馈只在本人账户内展示。"
              />
              <AssuranceRow
                icon={BadgeCheck}
                title="阶段证明"
                description="完成课程后生成阶段证明预览，正式签发需后续服务端确认。"
              />
              <AssuranceRow
                icon={HeartHandshake}
                title="咨询衔接"
                description="如果学习中发现需要更多支持，可从课程页进入咨询预约。"
              />
            </div>
          </div>
        </section>

        {(nextPathCourses.length > 0 || supplementalCourses.length > 0) && (
          <section className="px-5 py-16 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-[1200px]">
              <div className="mb-7 flex items-end justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">
                    继续探索
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-[#243B35]">
                    下一门课与补充内容分开看
                  </h2>
                </div>
                <button
                  onClick={() => navigate("/courses")}
                  className="hidden items-center text-sm font-semibold text-[#41675A] transition hover:text-[#243B35] sm:inline-flex"
                >
                  回到课程中心
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>

              <div className="space-y-12">
                {nextPathCourses.length > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[#8C6E4A]">
                          继续这条路径
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                          按学习路径接着走，减少下一步选择成本。
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {nextPathCourses.map(item => (
                        <CompactCourseCard
                          key={item.id}
                          course={item}
                          eyebrow={`${learningPath.label}路径`}
                          onClick={() => navigate(`/courses/${item.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {supplementalCourses.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-[#8C6E4A]">
                        同主题补充
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                        这些课程保留在关联推荐层，用来扩展主题理解。
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {supplementalCourses.map(item => (
                        <CompactCourseCard
                          key={item.id}
                          course={item}
                          eyebrow={item.category}
                          onClick={() => navigate(`/courses/${item.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <AppFooter />

      <CourseCheckoutDrawer
        course={course}
        isOpen={Boolean(checkoutMode)}
        selectedPaymentChannel={selectedPaymentChannel}
        status={checkoutStatus}
        summary={checkoutSummary}
        checkoutOrder={checkoutOrder}
        checkoutError={checkoutError}
        acceptedTerms={acceptedTerms}
        isSyncing={isSyncing}
        onAcceptedTermsChange={setAcceptedTerms}
        onCancelOrder={handleCancelCheckoutOrder}
        onClose={closeCheckout}
        onConfirm={handleConfirmCheckout}
        onPaymentChannelChange={setSelectedPaymentChannel}
        onStartLearning={handleStartAfterCheckout}
        onViewWorkspace={() => {
          closeCheckout();
          navigate("/me/courses");
        }}
      />
      {!checkoutMode && (
        <MobilePurchaseBar
          course={course}
          disabled={isSyncing}
          label={isSyncing ? "同步中" : effectivePrimaryActionLabel}
          priceLabel={
            pendingCheckoutPrompt
              ? formatCheckoutMoney(
                  pendingCheckoutPrompt.checkout.payment.payableAmount
                )
              : formatPrice(course)
          }
          hint={
            pendingCheckoutPrompt
              ? `待支付保留至 ${formatCheckoutDateTime(
                  pendingCheckoutPrompt.checkout.payment.expiresAt
                )}`
              : undefined
          }
          onClick={handlePrimaryAction}
        />
      )}
    </div>
  );
}

function CourseTrustSection({
  course,
  disabled,
  primaryActionLabel,
  profile,
  summary,
  onConsult,
  onPrimaryAction,
}: {
  course: Course;
  disabled: boolean;
  primaryActionLabel: string;
  profile: CourseTrustProfile;
  summary: string;
  onConsult: () => void;
  onPrimaryAction: () => void;
}) {
  return (
    <section className="bg-[#F7F1E8] px-5 py-16 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-24"
          >
            <p className="text-sm font-semibold text-[#6F8F83]">购买信任</p>
            <h2 className="mt-3 max-w-[520px] text-3xl font-semibold leading-tight text-[#243B35]">
              下单前，把老师、反馈和售后边界看清楚
            </h2>
            <p className="mt-4 max-w-[520px] text-sm leading-7 text-[#6D746F]">
              心理课程的信任不是只看价格，而是看讲师是否清楚、内容边界是否透明、购买后是否能被持续承接。
            </p>

            <div className="mt-8 grid grid-cols-3 divide-x divide-[#D8CEC0] border-y border-[#D8CEC0]">
              {profile.metrics.map(metric => (
                <TrustMetric key={metric.label} metric={metric} />
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-[#7B817C]">{summary}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={onPrimaryAction}
                disabled={disabled}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#243B35] px-6 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-65"
              >
                {primaryActionLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <button
                onClick={onConsult}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#D8CEC0] px-6 text-sm font-semibold text-[#41675A] transition hover:bg-[#EEF4EA]"
              >
                咨询师陪伴
              </button>
            </div>
          </motion.div>

          <div className="divide-y divide-[#D8CEC0] border-y border-[#D8CEC0]">
            <TrustProofRow
              icon={UserCheck}
              title="讲师与内容审核"
              eyebrow={profile.instructor.title}
              description={profile.instructor.description}
            >
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {profile.instructor.highlights.map(item => (
                  <div
                    key={item.title}
                    className="border-l border-[#C9D8C2] pl-4"
                  >
                    <p className="text-sm font-semibold text-[#243B35]">
                      {item.title}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#6D746F]">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </TrustProofRow>

            <TrustProofRow
              icon={MessageCircle}
              title="学习反馈"
              eyebrow={`${course.category} · ${course.type}`}
              description="评价信息优先展示学习后的变化和可验证结果，而不是只堆叠情绪化好评。"
            >
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {profile.feedback.map(item => (
                  <figure
                    key={item.quote}
                    className="rounded-[22px] bg-[#FFFDF8] p-5"
                  >
                    <p className="text-xs font-semibold text-[#6F8F83]">
                      {item.profile}
                    </p>
                    <blockquote className="mt-3 text-sm leading-7 text-[#243B35]">
                      {item.quote}
                    </blockquote>
                    <figcaption className="mt-4 border-t border-[#E4DCCF] pt-3 text-xs font-semibold text-[#7B817C]">
                      结果：{item.result}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </TrustProofRow>

            <TrustProofRow
              icon={ShieldCheck}
              title="售后与隐私边界"
              eyebrow="交易保障"
              description="把用户最关心的权益、待支付、退款和隐私边界前置到购买前。"
            >
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {profile.policies.map(item => (
                  <div
                    key={item.title}
                    className="flex gap-3 rounded-[18px] bg-[#FFFDF8] px-4 py-4"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#6F8F83]" />
                    <div>
                      <p className="text-sm font-semibold text-[#243B35]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#6D746F]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TrustProofRow>
          </div>
        </div>

        <div className="mt-12 grid gap-8 border-t border-[#D8CEC0] pt-10 lg:grid-cols-[0.76fr_1.24fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
              <CircleHelp className="h-4 w-4" />
              购买前常见问题
            </div>
            <p className="mt-3 text-sm leading-7 text-[#6D746F]">
              先回答适用边界、权益交付、阶段证明和售后处理，减少用户在支付前的犹豫。
            </p>
          </div>

          <div className="divide-y divide-[#D8CEC0] border-y border-[#D8CEC0]">
            {profile.faqs.map(item => (
              <details key={item.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold text-[#243B35]">
                  {item.question}
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#6F8F83] transition group-open:rotate-90" />
                </summary>
                <p className="mt-3 max-w-[760px] text-sm leading-7 text-[#6D746F]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustMetric({
  metric,
}: {
  metric: CourseTrustProfile["metrics"][number];
}) {
  return (
    <div className="px-3 py-5 first:pl-0 last:pr-0">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7B817C]">
        <Star className="h-3.5 w-3.5 fill-[#C4A46A] text-[#C4A46A]" />
        {metric.label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#243B35]">
        {metric.value}
      </p>
      <p className="mt-2 text-xs leading-5 text-[#6D746F]">
        {metric.description}
      </p>
    </div>
  );
}

function TrustProofRow({
  children,
  description,
  eyebrow,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      className="grid gap-5 py-7 md:grid-cols-[56px_1fr]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold text-[#6F8F83]">{eyebrow}</p>
        <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#243B35]">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-[#6D746F]">{description}</p>
        {children}
      </div>
    </motion.div>
  );
}

function CommercePanel({
  accessLabel,
  course,
  favorite,
  hasActiveMembership,
  isSyncing,
  locked,
  primaryActionLabel,
  primaryActionDescription,
  PrimaryActionIcon,
  trustProfile,
  trustSummary,
  visibleLearningStatus,
  visibleProgressPercent,
  onActivateMembership,
  onConsult,
  onOpenCourseCheckout,
  onPrimaryAction,
  onToggleFavorite,
}: {
  accessLabel: string;
  course: Course;
  favorite: boolean;
  hasActiveMembership: boolean;
  isSyncing: boolean;
  locked: boolean;
  primaryActionLabel: string;
  primaryActionDescription: string;
  PrimaryActionIcon: typeof PlayCircle;
  trustProfile: CourseTrustProfile;
  trustSummary: string;
  visibleLearningStatus: string;
  visibleProgressPercent: number;
  onActivateMembership: () => void;
  onConsult: () => void;
  onOpenCourseCheckout: () => void;
  onPrimaryAction: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
      className="self-start rounded-[28px] border border-white/14 bg-[#FFFDF8] p-5 text-[#243B35] shadow-2xl shadow-black/20 lg:sticky lg:top-24"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[#6F8F83]">课程商品</p>
        <button
          onClick={onToggleFavorite}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
            favorite
              ? "bg-[#F4E5DE] text-[#A65F48]"
              : "bg-[#E6EDDF] text-[#41675A] hover:bg-[#DDE8D9]"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${favorite ? "fill-current" : ""}`} />
          {favorite ? "已收藏" : "收藏"}
        </button>
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold text-[#A65F48]">
            {formatPrice(course)}
          </p>
          {!course.isFree && course.originalPrice > course.price && (
            <p className="mt-1 text-xs text-[#9AA19B] line-through">
              {formatCheckoutMoney(course.originalPrice)}
            </p>
          )}
        </div>
        <span className="rounded-full bg-[#E6EDDF] px-3 py-1 text-xs font-semibold text-[#41675A]">
          {accessLabel}
        </span>
      </div>

      {course.coupon && (
        <div className="mt-4 rounded-[18px] bg-[#FFF5EF] px-4 py-3 text-xs leading-5 text-[#A65F48]">
          {course.coupon.label} · 下单可抵扣{" "}
          {formatCheckoutMoney(course.coupon.amount)}
        </div>
      )}

      <div className="mt-4 divide-y divide-[#E4DCCF] rounded-[20px] border border-[#E4DCCF] bg-white">
        {trustProfile.metrics.slice(0, 2).map(metric => (
          <div
            key={metric.label}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="text-xs font-semibold text-[#7B817C]">
              {metric.label}
            </span>
            <span className="text-sm font-semibold text-[#243B35]">
              {metric.value}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#7B817C]">{trustSummary}</p>

      <div className="mt-5 rounded-[20px] bg-[#F4EFE6] p-4">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[#6D746F]">学习状态</span>
          <span
            className={
              locked
                ? "text-[#A65F48]"
                : visibleProgressPercent > 0
                  ? "text-[#41675A]"
                  : "text-[#9AA19B]"
            }
          >
            {visibleLearningStatus}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-[#6F8F83] transition-all"
            style={{ width: `${visibleProgressPercent}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-[#7B817C]">
          {primaryActionDescription}
        </p>
      </div>

      {course.isVip && !hasActiveMembership && locked && (
        <div className="mt-4 grid gap-3">
          <button
            onClick={onActivateMembership}
            disabled={isSyncing}
            className="rounded-[20px] border border-[#D7C49C] bg-[#F4EBD8] p-4 text-left transition hover:bg-[#EFE1C5] disabled:cursor-wait disabled:opacity-65"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#7A5B31]">
                开通成长会员
              </span>
              <Crown className="h-4 w-4 text-[#8C6E4A]" />
            </span>
            <span className="mt-2 block text-xs leading-5 text-[#8A7350]">
              适合计划连续学习会员课程的用户。
            </span>
          </button>
          {course.price > 0 && (
            <button
              onClick={onOpenCourseCheckout}
              disabled={isSyncing}
              className="rounded-[20px] border border-[#E4DCCF] bg-white px-4 py-3 text-left text-xs font-semibold text-[#5F6B64] transition hover:border-[#AFC2AB] disabled:cursor-wait disabled:opacity-65"
            >
              只购买本课 · {formatCheckoutMoney(course.price)}
            </button>
          )}
        </div>
      )}

      <div className="mt-5 space-y-3 text-sm text-[#5F6B64]">
        <p className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-[#6F8F83]" />
          购买确认后写入课程权益
        </p>
        <p className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#6F8F83]" />
          学习记录仅自己可见
        </p>
        <p className="flex items-center gap-2">
          <HeartHandshake className="h-4 w-4 text-[#6F8F83]" />
          可衔接测评与咨询支持
        </p>
      </div>

      <button
        onClick={onPrimaryAction}
        disabled={isSyncing}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#243B35] text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-65"
      >
        <PrimaryActionIcon className="mr-2 h-4 w-4" />
        {isSyncing ? "同步中" : primaryActionLabel}
      </button>
      <button
        onClick={onConsult}
        className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full border border-[#DCD3C4] text-sm font-semibold text-[#41675A] transition hover:bg-[#EEF4EA]"
      >
        需要咨询师陪伴
      </button>
    </motion.aside>
  );
}

function MobilePurchaseBar({
  course,
  disabled,
  hint,
  label,
  priceLabel,
  onClick,
}: {
  course: Course;
  disabled: boolean;
  hint?: string;
  label: string;
  priceLabel?: string;
  onClick: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E4DCCF] bg-[#FFFDF8]/96 px-4 py-3 shadow-[0_-10px_30px_rgba(36,59,53,0.12)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-[480px] items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#7B817C]">课程权益</p>
          <p className="mt-1 truncate text-lg font-semibold text-[#A65F48]">
            {priceLabel ?? formatPrice(course)}
          </p>
          {hint && (
            <p className="mt-1 truncate text-xs text-[#7B817C]">{hint}</p>
          )}
        </div>
        <button
          onClick={onClick}
          disabled={disabled}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#243B35] px-5 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-65"
        >
          {label}
        </button>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string;
  label: string;
}) {
  return (
    <div className="border-l border-white/18 pl-4 first:border-l-0 first:pl-0">
      <Icon className="h-4 w-4 text-[#BFD0B8]" />
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/58">{label}</p>
    </div>
  );
}

function DeliveryFact({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <div className="border-l border-[#E4DCCF] pl-4 first:border-l-0 first:pl-0">
      <Icon className="h-5 w-5 text-[#6F8F83]" />
      <p className="mt-3 text-sm font-semibold text-[#243B35]">{title}</p>
      <p className="mt-1 text-xs leading-5 text-[#6D746F]">{description}</p>
    </div>
  );
}

function PathFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-xs font-semibold text-[#7B817C]">{label}</span>
      <span className="text-sm font-semibold text-[#243B35]">{value}</span>
    </div>
  );
}

function AssuranceRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ReceiptText;
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-4 py-5 sm:grid-cols-[44px_1fr]">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-base font-semibold text-[#243B35]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#6D746F]">{description}</p>
      </div>
    </div>
  );
}

function CompactCourseCard({
  course,
  eyebrow,
  onClick,
}: {
  course: Course;
  eyebrow: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-[24px] border border-[#E4DCCF] bg-[#FFFDF8] p-4 text-left transition hover:-translate-y-1 hover:border-[#AFC2AB]"
    >
      <img
        src={course.coverUrl}
        alt=""
        className="h-36 w-full rounded-[18px] object-cover"
      />
      <p className="mt-4 text-xs font-semibold text-[#6F8F83]">{eyebrow}</p>
      <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-[#243B35] group-hover:text-[#5F7F73]">
        {course.title}
      </h3>
      <p className="mt-3 text-sm text-[#7B817C]">{course.teacher}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#EAE2D6] pt-3 text-xs font-semibold">
        <span className="text-[#A65F48]">{formatPrice(course)}</span>
        <span className="text-[#7B817C]">
          {formatLearners(course.learners)} 人学习
        </span>
      </div>
    </button>
  );
}
