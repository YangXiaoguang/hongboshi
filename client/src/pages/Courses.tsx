import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgePercent,
  BookOpenCheck,
  ClipboardList,
  Crown,
  HeartHandshake,
  Search,
  ShoppingBag,
  Star,
  Users,
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
  createCoursePromotionSummary,
  findPendingCourseCheckoutOrder,
  findMembershipCheckoutAnchorCourse,
  formatCheckoutMoney,
  getCourseDetailPrimaryActionCopy,
  getCourseLearningPath,
  isCourseMembershipCheckoutIntent,
  resolveDefaultCheckoutCouponClaimId,
  selectFeaturedCourseProducts,
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
  type CourseMarketingRule,
  type CoursePendingCheckoutPrompt,
} from "@/features/courses";
import { useCourseMembershipProduct } from "@/features/memberships";

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
    product: membershipProduct,
    primaryPlan: membershipPlan,
    error: membershipProductError,
    isPurchasable: isMembershipProductPurchasable,
  } = useCourseMembershipProduct();
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
  const featuredProducts = useMemo(
    () => selectFeaturedCourseProducts(allCourses, 4),
    [allCourses]
  );
  const checkoutSummary =
    checkoutCourse && checkoutMode
      ? createCourseCheckoutSummary(checkoutCourse, checkoutMode, {
          marketingRules,
          membershipProduct,
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
      ? createCourseCheckoutSummary(course, options.mode, {
          marketingRules,
          membershipProduct,
        })
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
  ): boolean => {
    const pendingCheckout =
      options.pendingCheckout ??
      findPendingCourseCheckoutOrder(accessState, course, mode);

    if (
      mode === "membership" &&
      !pendingCheckout &&
      !isMembershipProductPurchasable
    ) {
      toast("会员暂不可购买", {
        description:
          membershipProductError ??
          "当前会员商品或套餐已暂停，已有待支付订单仍可继续完成。",
      });
      return false;
    }

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
    return true;
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
    const opened = openCheckout(anchorCourse, "membership", {
      source: "url_checkout_intent",
    });
    if (opened) {
      toast("已打开会员开通", {
        description: "开通后，会员课程会自动进入可学习权益。",
      });
    }
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
    navigate(`/courses/${course.id}?focus=content`);
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
        if (checkoutMode === "membership" && !isMembershipProductPurchasable) {
          setCheckoutStatus("failed");
          setCheckoutError(
            membershipProductError ??
              "当前会员商品或套餐已暂停，暂不能创建新订单。"
          );
          toast("会员暂不可购买", {
            description: "已有待支付订单仍可继续完成，新订单需要等待套餐恢复。",
          });
          return;
        }

        setCheckoutStatus("creating");
        const created = await createCheckoutOrder(
          checkoutCourse,
          checkoutMode,
          checkoutCouponClaimId,
          checkoutMode === "membership"
            ? {
                membershipProduct,
                membershipProductId: membershipProduct.id,
                membershipPlanId: membershipPlan.id,
              }
            : undefined
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

            <CourseHeroProductPanel
              courses={featuredProducts.slice(0, 3)}
              getCourseAction={getCoursePrimaryAction}
              marketingRules={marketingRules}
              onCourseAction={course =>
                handleCoursePrimaryAction(course, "courses_hero")
              }
              onCourseSelect={(course, position) =>
                handleCourseSelect(course, "courses_hero", position)
              }
              onSearchFocus={() =>
                document
                  .getElementById("courses")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />
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

        <CourseMallShelf
          courses={featuredProducts}
          getCourseAction={getCoursePrimaryAction}
          marketingRules={marketingRules}
          onCourseAction={course =>
            handleCoursePrimaryAction(course, "course_starter")
          }
          onCourseSelect={(course, position) =>
            handleCourseSelect(course, "course_starter", position)
          }
          onViewAll={() =>
            document
              .getElementById("courses")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        />

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

function CourseHeroProductPanel({
  courses,
  getCourseAction,
  marketingRules,
  onCourseAction,
  onCourseSelect,
  onSearchFocus,
}: {
  courses: Course[];
  getCourseAction: (course: Course) => {
    label: string;
    description: string;
    tone: "buy" | "learn" | "member";
  };
  marketingRules?: CourseMarketingRule[];
  onCourseAction: (course: Course) => void;
  onCourseSelect: (course: Course, position: number) => void;
  onSearchFocus: () => void;
}) {
  const [primaryCourse, ...secondaryCourses] = courses;
  if (!primaryCourse) return null;

  const primaryPromotion = createCoursePromotionSummary(primaryCourse, {
    marketingRules,
  });
  const primaryAction = getCourseAction(primaryCourse);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.54, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="rounded-[30px] border border-white/18 bg-[#FFFDF8] p-4 text-[#243B35] shadow-2xl shadow-black/22"
    >
      <div className="mb-4 flex items-center justify-between gap-4 px-1">
        <div>
          <p className="text-xs font-semibold text-[#6F8F83]">课程商品推荐</p>
          <h2 className="mt-1 text-xl font-semibold">先看可购买的热门课</h2>
        </div>
        <button
          onClick={onSearchFocus}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A] transition hover:bg-[#DDE8D9]"
          title="搜索课程"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      <button
        onClick={() => onCourseSelect(primaryCourse, 0)}
        className="group relative block w-full overflow-hidden rounded-[24px] text-left"
      >
        <img
          src={primaryCourse.coverUrl}
          alt=""
          className="h-56 w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#13211D]/82 via-[#13211D]/24 to-transparent" />
        <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#41675A]">
            <Star className="mr-1.5 h-3.5 w-3.5 fill-current" />
            热卖课程
          </span>
          {primaryCourse.coupon && (
            <span className="inline-flex items-center rounded-full bg-[#F4E5DE] px-3 py-1.5 text-xs font-semibold text-[#A65F48]">
              <BadgePercent className="mr-1.5 h-3.5 w-3.5" />
              {primaryCourse.coupon.label}
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <p className="text-xs font-semibold text-white/72">
            {primaryCourse.category} / {primaryCourse.teacher}
          </p>
          <h3 className="mt-2 line-clamp-2 text-2xl font-semibold leading-tight">
            {primaryCourse.title}
          </h3>
        </div>
      </button>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#A65F48]">到手价</p>
          <p className="mt-1 text-2xl font-semibold text-[#A65F48]">
            {primaryCourse.isFree
              ? "免费"
              : formatCheckoutMoney(primaryPromotion.coursePayableAmount)}
          </p>
        </div>
        <button
          onClick={() => onCourseAction(primaryCourse)}
          title={primaryAction.description}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#243B35] px-5 text-sm font-semibold text-white transition hover:bg-[#315047]"
        >
          {primaryAction.tone === "member" ? (
            <Crown className="mr-2 h-4 w-4" />
          ) : primaryAction.tone === "learn" ? (
            <BookOpenCheck className="mr-2 h-4 w-4" />
          ) : (
            <ShoppingBag className="mr-2 h-4 w-4" />
          )}
          {primaryAction.label}
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {secondaryCourses.map((course, index) => {
          const promotion = createCoursePromotionSummary(course, {
            marketingRules,
          });
          const action = getCourseAction(course);

          return (
            <div
              key={course.id}
              className="grid grid-cols-[64px_1fr_auto] items-center gap-3 border-t border-[#EFE6DA] pt-3"
            >
              <button
                onClick={() => onCourseSelect(course, index + 1)}
                className="overflow-hidden rounded-[18px]"
              >
                <img
                  src={course.coverUrl}
                  alt=""
                  className="h-14 w-16 object-cover transition duration-500 hover:scale-105"
                />
              </button>
              <button
                onClick={() => onCourseSelect(course, index + 1)}
                className="min-w-0 text-left"
              >
                <span className="line-clamp-1 text-sm font-semibold text-[#243B35]">
                  {course.title}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-xs text-[#7B817C]">
                  <Users className="h-3.5 w-3.5" />
                  {course.learners.toLocaleString("zh-CN")} 人学习
                </span>
              </button>
              <button
                onClick={() => onCourseAction(course)}
                title={action.description}
                className="text-right"
              >
                <span className="block text-sm font-semibold text-[#A65F48]">
                  {course.isFree
                    ? "免费"
                    : formatCheckoutMoney(promotion.coursePayableAmount)}
                </span>
                <span className="mt-1 block text-[11px] font-semibold text-[#41675A]">
                  {action.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-[#EFE6DA] pt-4 text-xs font-semibold text-[#6D746F]">
        {[
          { icon: BookOpenCheck, label: "看详情" },
          { icon: ClipboardList, label: "可测评" },
          { icon: HeartHandshake, label: "可咨询" },
        ].map(item => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <item.icon className="h-3.5 w-3.5 text-[#6F8F83]" />
            {item.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function CourseMallShelf({
  courses,
  getCourseAction,
  marketingRules,
  onCourseAction,
  onCourseSelect,
  onViewAll,
}: {
  courses: Course[];
  getCourseAction: (course: Course) => {
    label: string;
    description: string;
    tone: "buy" | "learn" | "member";
  };
  marketingRules?: CourseMarketingRule[];
  onCourseAction: (course: Course) => void;
  onCourseSelect: (course: Course, position: number) => void;
  onViewAll: () => void;
}) {
  if (courses.length === 0) return null;

  return (
    <section className="bg-[#FFFDF8] px-5 py-12 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#6F8F83]">课程商品货架</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35]">
              热门课先摆出来，少走两步再下单
            </h2>
          </div>
          <button
            onClick={onViewAll}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#D8CDBD] px-5 text-sm font-semibold text-[#41675A] transition hover:bg-[#EEF4EA]"
          >
            查看全部课程
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {courses.map((course, index) => {
            const promotion = createCoursePromotionSummary(course, {
              marketingRules,
            });
            const action = getCourseAction(course);

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.38, delay: index * 0.04 }}
                className="overflow-hidden rounded-[24px] border border-[#E4DCCF] bg-[#F9F5EE]"
              >
                <button
                  onClick={() => onCourseSelect(course, index)}
                  className="group relative block w-full overflow-hidden text-left"
                >
                  <img
                    src={course.coverUrl}
                    alt=""
                    className="h-44 w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#13211D]/72 via-transparent to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#41675A]">
                    {course.category}
                  </span>
                  <span className="absolute bottom-4 left-4 right-4 line-clamp-2 text-lg font-semibold leading-tight text-white">
                    {course.title}
                  </span>
                </button>

                <div className="p-4">
                  <div className="flex items-center justify-between gap-3 text-xs text-[#7B817C]">
                    <span className="truncate">{course.teacher}</span>
                    <span>{course.learners.toLocaleString("zh-CN")} 人学</span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#8A918B]">
                        {promotion.courseCouponAmount > 0
                          ? "券后价"
                          : course.isVip
                            ? "会员内容"
                            : "课程价"}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-[#A65F48]">
                        {course.isFree
                          ? "免费"
                          : formatCheckoutMoney(promotion.coursePayableAmount)}
                      </p>
                    </div>
                    <button
                      onClick={() => onCourseAction(course)}
                      title={action.description}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[#243B35] px-4 text-xs font-semibold text-white transition hover:bg-[#315047]"
                    >
                      {action.label}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
