import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardList,
  HeartHandshake,
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
import CoursePendingCheckoutBanner from "@/components/CoursePendingCheckoutBanner";
import CoursePathSection from "@/components/CoursePathSection";
import CourseStarterLanes from "@/components/CourseStarterLanes";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_COURSE_LEARNING_PATH_ID,
  countClaimableCourseCoupons,
  createCourseConversionCoursePayload,
  createCourseCheckoutCouponOptions,
  createCourseCheckoutSummary,
  createPendingCourseCheckoutPrompts,
  COURSE_MEMBERSHIP_PAGE_PATH,
  findPendingCourseCheckoutOrder,
  findMembershipCheckoutAnchorCourse,
  getCourseDetailPrimaryActionCopy,
  getCourseLearningPath,
  isCourseMembershipCheckoutIntent,
  resolveDefaultCheckoutCouponClaimId,
  trackCourseConversionEvent,
  useCourseAccess,
  useCourseCatalog,
  useCourseEngagement,
  useCourseMarketingRules,
  useUserPreference,
  type Course,
  type CourseCheckoutMode,
  type CourseCheckoutOrderResult,
  type CourseCheckoutPaymentChannel,
  type CourseConversionEventName,
  type CourseConversionSource,
  type CourseLearningPath,
  type CoursePendingCheckoutPrompt,
} from "@/features/courses";

const courseHeroImage =
  "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1800&q=86";

export default function Courses() {
  const [, navigate] = useLocation();
  const { user, isLoggedIn } = useAuth();
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
  } = useCourseEngagement({
    userId: user?.id,
    enableRemoteSync: isLoggedIn,
    favoriteSource: "course_list",
  });
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
  const { rules: marketingRules } = useCourseMarketingRules();
  const {
    claimCoupon,
    couponClaims,
    claimingCouponRuleId,
    isPreferenceLoading,
    preferenceError,
    reloadPreference,
  } = useUserPreference();
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
  const [selectedCouponClaimId, setSelectedCouponClaimId] = useState<
    string | undefined
  >();
  const [isCouponSelectionManual, setIsCouponSelectionManual] = useState(false);
  const [checkoutIntentHandled, setCheckoutIntentHandled] = useState(false);
  const selectedPath = getCourseLearningPath(selectedPathId);
  const checkoutSummary =
    checkoutCourse && checkoutMode
      ? createCourseCheckoutSummary(checkoutCourse, checkoutMode, {
          marketingRules,
        })
      : undefined;
  const checkoutCouponOptions = useMemo(
    () =>
      checkoutCourse && checkoutMode === "course"
        ? createCourseCheckoutCouponOptions({
            course: checkoutCourse,
            marketingRules,
            couponClaims,
          })
        : [],
    [checkoutCourse, checkoutMode, couponClaims, marketingRules]
  );
  const checkoutClaimableCouponCount = useMemo(
    () =>
      checkoutCourse && checkoutMode === "course"
        ? countClaimableCourseCoupons({
            course: checkoutCourse,
            marketingRules,
            couponClaims,
          })
        : 0,
    [checkoutCourse, checkoutMode, couponClaims, marketingRules]
  );
  const trackedImpressionsRef = useRef(new Set<string>());

  const trackCourseConversion = (
    name: CourseConversionEventName,
    course: Course,
    source: CourseConversionSource,
    options: {
      mode?: CourseCheckoutMode;
      order?: CourseCheckoutOrderResult;
      paymentChannel?: CourseCheckoutPaymentChannel;
      position?: number;
      path?: CourseLearningPath;
      metadata?: Record<string, string | number | boolean | null>;
    } = {}
  ) => {
    const path = options.path ?? selectedPath;
    const summary = options.mode
      ? createCourseCheckoutSummary(course, options.mode, { marketingRules })
      : undefined;

    void trackCourseConversionEvent(
      createCourseConversionCoursePayload({
        name,
        course,
        source,
        accessStatus: getCourseAccess(course).status,
        checkoutMode: options.mode,
        orderId: options.order?.order.id,
        paymentChannel: options.paymentChannel,
        position: options.position,
        pathId: path.id,
        pathLabel: path.label,
        listPrice: summary?.listPrice,
        originalPrice: summary?.originalPrice,
        discountAmount: summary?.discountAmount,
        payableAmount: summary?.payableAmount,
        metadata: options.metadata,
      })
    );
  };

  useEffect(() => {
    paginatedCourses.forEach((course, index) => {
      const key = [
        selectedPath.id,
        selectedCategory,
        selectedType,
        activeSort,
        vipOnly ? "vip" : "all",
        currentPage,
        course.id,
      ].join(":");

      if (trackedImpressionsRef.current.has(key)) return;
      trackedImpressionsRef.current.add(key);
      trackCourseConversion("course_impression", course, "courses_discovery", {
        position: index,
        metadata: {
          selectedCategory,
          selectedType,
          activeSort,
          vipOnly,
          currentPage,
        },
      });
    });
  }, [
    activeSort,
    currentPage,
    paginatedCourses,
    selectedCategory,
    selectedPath.id,
    selectedType,
    vipOnly,
  ]);

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
    options: {
      pendingCheckout?: CourseCheckoutOrderResult;
      source?: CourseConversionSource;
    } = {}
  ) => {
    const pendingCheckout =
      options.pendingCheckout ??
      findPendingCourseCheckoutOrder(accessState, course, mode);

    setCheckoutCourse(course);
    setCheckoutMode(mode);
    setCheckoutStatus(pendingCheckout ? "pending_payment" : "idle");
    setAcceptedTerms(false);
    setSelectedPaymentChannel("wechat_pay");
    setCheckoutOrder(pendingCheckout);
    setCheckoutError(undefined);
    setIsCouponSelectionManual(false);
    trackCourseConversion(
      "course_checkout_opened",
      course,
      options.source ?? "unknown",
      {
        mode,
        order: pendingCheckout,
        metadata: {
          hasPendingCheckout: Boolean(pendingCheckout),
        },
      }
    );
  };

  useEffect(() => {
    if (checkoutIntentHandled) return;
    if (typeof window === "undefined") return;
    if (!isCourseMembershipCheckoutIntent(window.location.search)) return;

    const anchorCourse = findMembershipCheckoutAnchorCourse(
      allCourses,
      getCourseAccess
    );
    if (!anchorCourse) return;

    const access = getCourseAccess(anchorCourse);
    if (!access.canActivateMembership) {
      setCheckoutIntentHandled(true);
      window.history.replaceState(null, "", "/courses");
      return;
    }

    setCheckoutIntentHandled(true);
    window.history.replaceState(null, "", "/courses");
    openCheckout(anchorCourse, "membership", {
      source: "url_checkout_intent",
    });
    toast("已打开会员开通", {
      description: "开通后，会员课程会自动进入可学习权益。",
    });
  }, [allCourses, checkoutIntentHandled]);

  const closeCheckout = () => {
    setCheckoutCourse(undefined);
    setCheckoutMode(undefined);
    setCheckoutStatus("idle");
    setAcceptedTerms(false);
    setCheckoutOrder(undefined);
    setCheckoutError(undefined);
    setSelectedCouponClaimId(undefined);
    setIsCouponSelectionManual(false);
  };

  useEffect(() => {
    if (!checkoutCourse || checkoutMode !== "course") {
      setSelectedCouponClaimId(undefined);
      return;
    }

    const nextCouponClaimId = isCouponSelectionManual
      ? selectedCouponClaimId
      : resolveDefaultCheckoutCouponClaimId({
          options: checkoutCouponOptions,
          order: checkoutOrder?.order,
          selectedCouponClaimId,
        });
    if (nextCouponClaimId !== selectedCouponClaimId) {
      setSelectedCouponClaimId(nextCouponClaimId);
    }
  }, [
    checkoutCourse,
    checkoutCouponOptions,
    checkoutMode,
    checkoutOrder?.order,
    isCouponSelectionManual,
    selectedCouponClaimId,
  ]);

  const handleClaimCheckoutCoupon = async (marketingRuleId: string) => {
    const preference = await claimCoupon(marketingRuleId);
    const claim = preference?.couponClaims.find(
      item => item.marketingRuleId === marketingRuleId
    );
    if (!claim) {
      toast("领取失败", { description: "请稍后再试或先登录账号。" });
      return;
    }

    setIsCouponSelectionManual(true);
    setSelectedCouponClaimId(claim.id);
    toast("优惠券已领取", {
      description: "已自动用于当前课程订单。",
    });
  };

  const pendingCheckoutPrompts = useMemo(
    () =>
      createPendingCourseCheckoutPrompts({
        accessState,
        courses: allCourses,
        resolveAccess: getCourseAccess,
      }),
    [accessState, allCourses, getCourseAccess]
  );

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

  const handleCourseSelect = (
    course: Course,
    source: CourseConversionSource,
    position?: number
  ) => {
    trackCourseConversion("course_detail_click", course, source, {
      position,
    });
    navigate(`/courses/${course.id}`);
  };

  const handleCoursePrimaryAction = (
    course: Course,
    source: CourseConversionSource = "courses_discovery"
  ) => {
    const access = getCourseAccess(course);
    const targetCheckoutMode: CourseCheckoutMode | undefined = access.canStart
      ? undefined
      : access.status === "requires_membership"
        ? "membership"
        : "course";

    trackCourseConversion("course_primary_action_click", course, source, {
      mode: targetCheckoutMode,
      metadata: {
        canStart: access.canStart,
      },
    });

    if (access.canStart) {
      trackCourseConversion("course_learning_started", course, source);
      startCourse(course.id);
      toast("已放入学习计划", {
        description: `即将进入「${course.title}」学习页。`,
      });
      navigate(`/courses/${course.id}/learn`);
      return;
    }

    if (!targetCheckoutMode) return;
    openCheckout(course, targetCheckoutMode, { source });
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
      const checkoutCouponClaimId =
        checkoutMode === "course" ? selectedCouponClaimId : undefined;
      const pendingCouponClaimId =
        pendingCheckout?.order.couponApplication?.claimId;
      if (
        pendingCheckout?.order.status !== "pending_payment" ||
        pendingCouponClaimId !== checkoutCouponClaimId
      ) {
        setCheckoutStatus("creating");
        const created = await createCheckoutOrder(
          checkoutCourse,
          checkoutMode,
          checkoutCouponClaimId
        );
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
        trackCourseConversion(
          "course_checkout_created",
          checkoutCourse,
          "checkout_drawer",
          {
            mode: checkoutMode,
            order: created.checkout,
          }
        );
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
      void reloadPreference();
      trackCourseConversion(
        "course_payment_success",
        checkoutCourse,
        "checkout_drawer",
        {
          mode: checkoutMode,
          order: paid.checkout,
          paymentChannel: selectedPaymentChannel,
        }
      );
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
    if (!checkoutCourse) return;
    const targetCourse = checkoutCourse;
    trackCourseConversion(
      "course_learning_started",
      targetCourse,
      "checkout_drawer",
      {
        mode: checkoutMode,
        order: checkoutOrder,
      }
    );
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
                <button
                  onClick={() => navigate(COURSE_MEMBERSHIP_PAGE_PATH)}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/35 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  开通会员
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
          <CoursePendingCheckoutBanner
            prompts={pendingCheckoutPrompts}
            onResume={prompt =>
              openCheckout(prompt.course, prompt.mode, {
                pendingCheckout: prompt.checkout,
                source: "pending_checkout",
              })
            }
            onCancel={handleCancelPendingCheckout}
          />
        )}

        <CoursePathSection
          courses={allCourses}
          marketingRules={marketingRules}
          selectedPathId={selectedPathId}
          onPathChange={applyCoursePath}
          onExplorePath={handleExploreCoursePath}
          onCourseSelect={course => handleCourseSelect(course, "course_path")}
          getCourseAction={getCoursePrimaryAction}
          onCourseAction={course =>
            handleCoursePrimaryAction(course, "course_path")
          }
          onAssessment={() => navigate("/assessment")}
        />

        <CourseStarterLanes
          courses={allCourses}
          marketingRules={marketingRules}
          onCourseSelect={course =>
            handleCourseSelect(course, "course_starter")
          }
          getCourseAction={getCoursePrimaryAction}
          onCourseAction={course =>
            handleCoursePrimaryAction(course, "course_starter")
          }
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
          marketingRules={marketingRules}
          getCourseAccessStatus={course => getCourseAccess(course).status}
          getCoursePrimaryAction={getCoursePrimaryAction}
          onToggleFavorite={toggleFavorite}
          onCourseSelect={(course: Course) =>
            handleCourseSelect(course, "courses_discovery")
          }
          onCoursePrimaryAction={course =>
            handleCoursePrimaryAction(course, "courses_discovery")
          }
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
          claimingCouponRuleId={claimingCouponRuleId}
          isOpen={Boolean(checkoutMode)}
          isSyncing={isSyncing}
          selectedPaymentChannel={selectedPaymentChannel}
          selectedCouponClaimId={selectedCouponClaimId}
          status={checkoutStatus}
          summary={checkoutSummary}
          claimableCouponCount={checkoutClaimableCouponCount}
          couponOptions={checkoutCouponOptions}
          isPreferenceLoading={isPreferenceLoading}
          preferenceError={preferenceError}
          onAcceptedTermsChange={setAcceptedTerms}
          onCancelOrder={handleCancelCheckoutOrder}
          onClaimCoupon={handleClaimCheckoutCoupon}
          onClose={closeCheckout}
          onConfirm={handleConfirmCheckout}
          onCouponClaimChange={claimId => {
            setIsCouponSelectionManual(true);
            setSelectedCouponClaimId(claimId);
          }}
          onPaymentChannelChange={setSelectedPaymentChannel}
          onViewOrder={orderId => {
            closeCheckout();
            navigate(`/me?tab=orders&orderId=${encodeURIComponent(orderId)}`);
          }}
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
