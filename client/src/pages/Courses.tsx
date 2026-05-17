import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardList,
  Clock3,
  HeartHandshake,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import CourseCheckoutDrawer, {
  formatCheckoutDateTime,
  type CourseCheckoutStatus,
} from "@/components/CourseCheckoutDrawer";
import CourseDiscoverySection from "@/components/CourseDiscoverySection";
import CoursePathSection from "@/components/CoursePathSection";
import CourseStarterLanes from "@/components/CourseStarterLanes";
import {
  DEFAULT_COURSE_LEARNING_PATH_ID,
  createCourseCheckoutSummary,
  findPendingCourseCheckoutOrder,
  formatCheckoutMoney,
  getCourseDetailPrimaryActionCopy,
  getCourseLearningPath,
  useCourseAccess,
  useCourseCatalog,
  useCourseEngagement,
  type Course,
  type CourseCheckoutMode,
  type CourseCheckoutOrderResult,
  type CourseCheckoutPaymentChannel,
  type CourseLearningPath,
} from "@/features/courses";

const courseHeroImage =
  "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1800&q=86";

interface PendingCheckoutPrompt {
  id: string;
  course: Course;
  mode: CourseCheckoutMode;
  checkout: CourseCheckoutOrderResult;
  title: string;
  subtitle: string;
}

export default function Courses() {
  const [, navigate] = useLocation();
  const [selectedPathId, setSelectedPathId] = useState(
    DEFAULT_COURSE_LEARNING_PATH_ID
  );
  const {
    selectedCategory,
    selectedType,
    activeSort,
    vipOnly,
    currentPage,
    totalPages,
    paginatedCourses,
    totalCount,
    pageNumbers,
    allCourses,
    setCategory,
    setType,
    setSort,
    setKeyword,
    setVipOnlyFilter,
    setCurrentPage,
  } = useCourseCatalog();
  const {
    favoriteCourseIds,
    favoriteCount,
    getProgress,
    startCourse,
    toggleFavorite,
  } = useCourseEngagement();
  const {
    accessState,
    cancelCheckoutOrder,
    createCheckoutOrder,
    getCourseAccess,
    hasActiveMembership,
    isSyncing,
    ownedCourseCount,
    payCheckoutOrder,
  } = useCourseAccess();
  const [checkoutCourse, setCheckoutCourse] = useState<Course | undefined>();
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
  const selectedPath = getCourseLearningPath(selectedPathId);
  const checkoutSummary =
    checkoutCourse && checkoutMode
      ? createCourseCheckoutSummary(checkoutCourse, checkoutMode)
      : undefined;

  const applyCoursePath = (path: CourseLearningPath) => {
    setSelectedPathId(path.id);
    setCategory(path.primaryCategory);
    setType("全部");
    setSort("hottest");
    setKeyword("");
  };

  const handleExploreCoursePath = (path: CourseLearningPath) => {
    applyCoursePath(path);
    document
      .getElementById("courses")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getCheckoutModeForCourse = (
    course: Course
  ): CourseCheckoutMode | undefined => {
    const access = getCourseAccess(course);
    if (access.canStart) return undefined;
    return access.status === "requires_membership" ? "membership" : "course";
  };

  const getPendingCheckoutForCourse = (course: Course) => {
    const mode = getCheckoutModeForCourse(course);
    if (!mode) return undefined;
    return findPendingCourseCheckoutOrder(accessState, course, mode);
  };

  const openCheckout = (
    course: Course,
    mode: CourseCheckoutMode,
    pendingCheckout = findPendingCourseCheckoutOrder(accessState, course, mode)
  ) => {
    setCheckoutCourse(course);
    setCheckoutMode(mode);
    setCheckoutStatus(pendingCheckout ? "pending_payment" : "idle");
    setAcceptedTerms(false);
    setSelectedPaymentChannel("wechat_pay");
    setCheckoutOrder(pendingCheckout);
    setCheckoutError(undefined);
  };

  const closeCheckout = () => {
    setCheckoutCourse(undefined);
    setCheckoutMode(undefined);
    setCheckoutStatus("idle");
    setAcceptedTerms(false);
    setCheckoutOrder(undefined);
    setCheckoutError(undefined);
  };

  const pendingCheckoutPrompts = useMemo<PendingCheckoutPrompt[]>(() => {
    const membershipAnchorCourse =
      allCourses.find(
        course => course.isVip && !getCourseAccess(course).canStart
      ) ??
      allCourses.find(course => course.isVip) ??
      allCourses[0];
    const prompts: PendingCheckoutPrompt[] = [];

    accessState.orders
      .filter(order => order.status === "pending_payment")
      .forEach(order => {
        const item = order.items[0];
        if (!item) return;

        if (item.type === "course") {
          const course = allCourses.find(
            candidate => String(candidate.id) === item.targetId
          );
          if (!course) return;
          const checkout = findPendingCourseCheckoutOrder(
            accessState,
            course,
            "course"
          );
          if (!checkout) return;
          prompts.push({
            id: order.id,
            course,
            mode: "course",
            checkout,
            title: item.title,
            subtitle: `${course.teacher} · ${course.category}`,
          });
          return;
        }

        if (item.type === "membership" && membershipAnchorCourse) {
          const checkout = findPendingCourseCheckoutOrder(
            accessState,
            membershipAnchorCourse,
            "membership"
          );
          if (!checkout) return;
          prompts.push({
            id: order.id,
            course: membershipAnchorCourse,
            mode: "membership",
            checkout,
            title: item.title,
            subtitle: "开通后会员课程可直接学习",
          });
        }

        return;
      });

    return prompts.slice(0, 3);
  }, [accessState, allCourses, getCourseAccess]);

  const getCoursePrimaryAction = (course: Course) => {
    const access = getCourseAccess(course);
    const hasStarted = Boolean(getProgress(course.id));
    const copy = getCourseDetailPrimaryActionCopy(access, hasStarted);
    const pendingCheckout = getPendingCheckoutForCourse(course);

    if (access.canStart) {
      return {
        label: hasStarted ? "继续学习" : "开始学习",
        description: copy.description,
        tone: "learn" as const,
      };
    }

    if (pendingCheckout) {
      return {
        label: "继续支付",
        description: `这笔订单已保留到 ${formatCheckoutDateTime(
          pendingCheckout.payment.expiresAt
        )}。`,
        tone: "buy" as const,
      };
    }

    if (access.status === "requires_membership") {
      return {
        label: "开通会员",
        description: copy.description,
        tone: "member" as const,
      };
    }

    return {
      label: "立即购买",
      description: copy.description,
      tone: "buy" as const,
    };
  };

  const handleCoursePrimaryAction = (course: Course) => {
    const access = getCourseAccess(course);

    if (access.canStart) {
      startCourse(course.id);
      toast("已放入学习计划", {
        description: `即将进入「${course.title}」学习页。`,
      });
      navigate(`/courses/${course.id}/learn`);
      return;
    }

    const checkoutMode =
      access.status === "requires_membership" ? "membership" : "course";
    openCheckout(course, checkoutMode);
  };

  const handleConfirmCheckout = () => {
    if (!checkoutCourse || !checkoutMode) return;
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
        const created = await createCheckoutOrder(checkoutCourse, checkoutMode);
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

  const handleStartAfterCheckout = () => {
    if (!checkoutCourse) return;
    const targetCourse = checkoutCourse;
    closeCheckout();
    startCourse(targetCourse.id);
    navigate(`/courses/${targetCourse.id}/learn`);
  };

  return (
    <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
      <AppHeader />

      <main>
        <section className="relative isolate overflow-hidden px-5 py-16 text-white sm:px-8 lg:px-12 lg:py-20">
          <motion.img
            src={courseHeroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.04, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#16251F]/90 via-[#243B35]/64 to-[#243B35]/24" />
          <div className="relative z-10 mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-sm font-semibold tracking-[0.24em] text-[#DDE8D9]">
                红博士心理课程
              </p>
              <h1 className="mt-5 max-w-[680px] text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                把心理成长变成可以开始的课程清单
              </h1>
              <p className="mt-5 max-w-[560px] text-base leading-8 text-white/78">
                从情绪、关系、亲子到职场压力，用课程路径帮你更快找到当下适合的学习入口。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() =>
                    document
                      .getElementById("courses")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#DDE8D9] px-6 text-sm font-semibold text-[#20362F] transition hover:bg-white"
                >
                  开始选课
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/assessment")}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/35 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  先做测评推荐课程
                </button>
              </div>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3 lg:pb-2">
              {[
                {
                  icon: BookOpenCheck,
                  title: "课程优先",
                  description: "先看主题与适合人群，再进入详情。",
                },
                {
                  icon: ClipboardList,
                  title: "测评推荐",
                  description: "不确定学什么时，用状态测评缩小选择。",
                },
                {
                  icon: HeartHandshake,
                  title: "咨询补充",
                  description: "需要更深支持时，再预约一对一咨询。",
                },
              ].map(item => (
                <div key={item.title} className="border-t border-white/24 pt-5">
                  <item.icon className="h-5 w-5 text-[#DDE8D9]" />
                  <h2 className="mt-4 text-base font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-white/68">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {pendingCheckoutPrompts.length > 0 && (
          <PendingCheckoutStrip
            prompts={pendingCheckoutPrompts}
            onResume={prompt =>
              openCheckout(prompt.course, prompt.mode, prompt.checkout)
            }
          />
        )}

        <CoursePathSection
          courses={allCourses}
          selectedPathId={selectedPathId}
          onPathChange={applyCoursePath}
          onExplorePath={handleExploreCoursePath}
          onCourseSelect={course => navigate(`/courses/${course.id}`)}
          getCourseAction={getCoursePrimaryAction}
          onCourseAction={handleCoursePrimaryAction}
          onAssessment={() => navigate("/assessment")}
        />

        <CourseStarterLanes
          courses={allCourses}
          onCourseSelect={course => navigate(`/courses/${course.id}`)}
          getCourseAction={getCoursePrimaryAction}
          onCourseAction={handleCoursePrimaryAction}
        />

        <CourseDiscoverySection
          id="courses"
          className="bg-[#F3EDE4]"
          eyebrow="路径匹配课程"
          title={selectedPath.discoveryTitle}
          description={selectedPath.discoveryDescription}
          favoriteCount={favoriteCount}
          ownedCourseCount={ownedCourseCount}
          hasActiveMembership={hasActiveMembership}
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          activeSort={activeSort}
          vipOnly={vipOnly}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageNumbers={pageNumbers}
          paginatedCourses={paginatedCourses}
          favoriteCourseIds={favoriteCourseIds}
          getCourseAccessStatus={course => getCourseAccess(course).status}
          getCoursePrimaryAction={getCoursePrimaryAction}
          onToggleFavorite={toggleFavorite}
          onCoursePrimaryAction={handleCoursePrimaryAction}
          onCategoryChange={setCategory}
          onTypeChange={setType}
          onSortChange={setSort}
          onSearch={setKeyword}
          onVipToggle={setVipOnlyFilter}
          onPageChange={setCurrentPage}
        />
      </main>

      {checkoutCourse && (
        <CourseCheckoutDrawer
          acceptedTerms={acceptedTerms}
          checkoutError={checkoutError}
          checkoutOrder={checkoutOrder}
          course={checkoutCourse}
          isOpen={Boolean(checkoutMode)}
          isSyncing={isSyncing}
          selectedPaymentChannel={selectedPaymentChannel}
          status={checkoutStatus}
          summary={checkoutSummary}
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
      )}

      <AppFooter />
    </div>
  );
}

function PendingCheckoutStrip({
  prompts,
  onResume,
}: {
  prompts: PendingCheckoutPrompt[];
  onResume: (prompt: PendingCheckoutPrompt) => void;
}) {
  return (
    <section className="bg-[#FFFDF8] px-5 py-5 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-[1200px] gap-4 border-y border-[#E4DCCF] py-5 lg:grid-cols-[260px_1fr] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
            <ReceiptText className="h-4 w-4" />
            待支付订单
          </div>
          <p className="mt-2 text-sm leading-6 text-[#6D746F]">
            已创建的课程订单会在这里召回，可以继续支付或取消。
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {prompts.map(prompt => (
            <button
              key={prompt.id}
              onClick={() => onResume(prompt)}
              className="group min-w-0 rounded-[20px] border border-[#E4DCCF] bg-[#F9F5EE] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#AFC2AB] hover:bg-[#F4EFE6]"
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
                    {formatCheckoutDateTime(prompt.checkout.payment.expiresAt)}
                  </span>
                </span>
                <span className="shrink-0 text-[#41675A] transition group-hover:text-[#243B35]">
                  继续支付
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
