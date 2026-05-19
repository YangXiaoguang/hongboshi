import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgePercent,
  BookOpenCheck,
  CheckCircle2,
  Crown,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import CourseCheckoutDrawer, {
  type CourseCheckoutStatus,
} from "@/components/CourseCheckoutDrawer";
import CoursePendingCheckoutBanner from "@/components/CoursePendingCheckoutBanner";
import { useAuth } from "@/contexts/AuthContext";
import {
  createPendingCourseCheckoutPrompts,
  createStandaloneMembershipCheckoutSummary,
  findPendingMembershipCheckoutOrder,
  formatCheckoutMoney,
  isCourseMembershipCheckoutIntent,
  useCourseAccess,
  useCourseCatalog,
  type CourseCheckoutOrderResult,
  type CourseCheckoutPaymentChannel,
  type CoursePendingCheckoutPrompt,
} from "@/features/courses";
import { useCourseMembershipProduct } from "@/features/memberships";

function formatDate(value?: string): string {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export default function Membership() {
  const [, navigate] = useLocation();
  const { isLoggedIn, openLoginModal } = useAuth();
  const { allCourses } = useCourseCatalog();
  const {
    accessState,
    cancelCheckoutOrder,
    createMembershipCheckoutOrder,
    getCourseAccess,
    hasActiveMembership,
    isSyncing,
    membership,
    payCheckoutOrder,
  } = useCourseAccess();
  const {
    product,
    primaryPlan: plan,
    error: membershipProductError,
    isFallback: isMembershipProductFallback,
  } = useCourseMembershipProduct();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] =
    useState<CourseCheckoutStatus>("idle");
  const [checkoutOrder, setCheckoutOrder] = useState<
    CourseCheckoutOrderResult | undefined
  >();
  const [checkoutError, setCheckoutError] = useState<string | undefined>();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedPaymentChannel, setSelectedPaymentChannel] =
    useState<CourseCheckoutPaymentChannel>("wechat_pay");
  const [checkoutIntentHandled, setCheckoutIntentHandled] = useState(false);
  const checkoutSummary = isCheckoutOpen
    ? createStandaloneMembershipCheckoutSummary(product)
    : undefined;
  const vipCourses = useMemo(
    () => allCourses.filter(course => course.isVip).slice(0, 4),
    [allCourses]
  );
  const categoryCount = useMemo(
    () => new Set(vipCourses.map(course => course.category)).size,
    [vipCourses]
  );
  const pendingMembershipPrompts = useMemo(
    () =>
      createPendingCourseCheckoutPrompts({
        accessState,
        courses: allCourses,
        resolveAccess: getCourseAccess,
      }).filter(prompt => prompt.mode === "membership"),
    [accessState, allCourses, getCourseAccess]
  );

  const closeCheckout = () => {
    setIsCheckoutOpen(false);
    setCheckoutStatus("idle");
    setCheckoutOrder(undefined);
    setCheckoutError(undefined);
    setAcceptedTerms(false);
    setSelectedPaymentChannel("wechat_pay");
  };

  const openMembershipCheckout = (
    pendingCheckout?: CourseCheckoutOrderResult
  ) => {
    if (hasActiveMembership) {
      toast("会员权益已生效", {
        description: "可以直接进入课程中心查看会员课程。",
      });
      navigate("/courses");
      return;
    }

    const nextPendingCheckout =
      pendingCheckout ??
      findPendingMembershipCheckoutOrder(accessState, plan.id);

    setIsCheckoutOpen(true);
    setCheckoutStatus(nextPendingCheckout ? "pending_payment" : "idle");
    setCheckoutOrder(nextPendingCheckout);
    setCheckoutError(undefined);
    setAcceptedTerms(false);
    setSelectedPaymentChannel("wechat_pay");
  };

  useEffect(() => {
    if (checkoutIntentHandled) return;
    if (typeof window === "undefined") return;
    if (!isCourseMembershipCheckoutIntent(window.location.search)) return;

    setCheckoutIntentHandled(true);
    window.history.replaceState(null, "", "/membership");
    openMembershipCheckout();
  }, [checkoutIntentHandled]);

  const handleConfirmCheckout = () => {
    if (!isCheckoutOpen) return;
    if (!acceptedTerms) {
      toast("请先确认购买须知", {
        description: "确认会员有效期、权益交付和开发期支付说明后再继续。",
      });
      return;
    }

    setCheckoutError(undefined);
    void (async () => {
      let pendingCheckout = checkoutOrder;
      if (pendingCheckout?.order.status !== "pending_payment") {
        setCheckoutStatus("creating");
        const created = await createMembershipCheckoutOrder({
          membershipProduct: product,
          membershipProductId: product.id,
          membershipPlanId: plan.id,
        });
        if (created === "auth_required") {
          setCheckoutStatus("idle");
          openLoginModal();
          toast("请先登录", {
            description: "登录后即可创建会员订单，并同步会员权益。",
          });
          return;
        }

        pendingCheckout = created.checkout;
        setCheckoutOrder(created.checkout);
      }

      setCheckoutStatus("processing");
      const paid = await payCheckoutOrder(
        pendingCheckout.order.id,
        selectedPaymentChannel
      );
      if (paid === "auth_required") {
        setCheckoutStatus("pending_payment");
        openLoginModal();
        toast("请先登录", {
          description: "登录后可继续完成这笔会员订单。",
        });
        return;
      }

      setCheckoutOrder(paid.checkout);
      setCheckoutStatus("success");
      toast("会员已开通", {
        description: "会员权益已经写入当前账号。",
      });
    })().catch(err => {
      setCheckoutStatus("failed");
      setCheckoutError(err instanceof Error ? err.message : "会员订单处理失败");
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
          openLoginModal();
          toast("请先登录", {
            description: "登录后可继续处理这笔会员订单。",
          });
          return;
        }

        setCheckoutOrder(result.checkout);
        setCheckoutStatus("failed");
        toast("订单已取消", {
          description: "会员权益未发放，你可以重新开通。",
        });
      })
      .catch(err => {
        setCheckoutStatus("failed");
        setCheckoutError(err instanceof Error ? err.message : "订单取消失败");
      });
  };

  const handleCancelPendingCheckout = (prompt: CoursePendingCheckoutPrompt) => {
    void cancelCheckoutOrder(prompt.checkout.order.id)
      .then(result => {
        if (result === "auth_required") {
          openLoginModal();
          toast("请先登录", {
            description: "登录后可继续处理这笔会员订单。",
          });
          return;
        }

        toast("订单已取消", {
          description: "会员权益未发放，你可以重新开通。",
        });
      })
      .catch(err => {
        toast("订单取消失败", {
          description: err instanceof Error ? err.message : "请稍后再试。",
        });
      });
  };

  const planPrice = formatCheckoutMoney(plan.payablePrice);
  const originalPrice = formatCheckoutMoney(plan.originalPrice);
  const isCheckoutBusy =
    checkoutStatus === "creating" || checkoutStatus === "processing";

  return (
    <div className="min-h-screen bg-[#F8F3EA] text-[#243B35]">
      <AppHeader />

      <main>
        <section className="relative min-h-[calc(100svh-62px)] overflow-hidden text-white">
          <motion.img
            src={product.heroImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ scale: 1.06, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#14231E]/92 via-[#243B35]/68 to-[#243B35]/18" />
          <div className="relative mx-auto flex min-h-[calc(100svh-62px)] max-w-[1240px] flex-col justify-center px-5 py-14 sm:px-8 lg:px-12">
            <motion.div
              className="max-w-[660px]"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-sm font-semibold tracking-[0.22em] text-[#DDE8D9]">
                {product.subtitle}
              </p>
              <h1 className="mt-5 text-5xl font-semibold leading-[1.04] tracking-normal sm:text-6xl lg:text-7xl">
                {product.title}
              </h1>
              <p className="mt-6 max-w-[580px] text-base leading-8 text-white/74">
                {product.description}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => openMembershipCheckout()}
                  disabled={isCheckoutBusy || isSyncing}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#DDE8D9] px-6 text-sm font-semibold text-[#20362F] transition hover:bg-white disabled:cursor-wait disabled:opacity-70"
                >
                  {hasActiveMembership ? "查看会员课程" : "立即开通会员"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/courses")}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/35 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  先看会员课程
                </button>
              </div>
              <div className="mt-10 grid max-w-[560px] grid-cols-3 border-y border-white/20 py-5">
                <div>
                  <p className="text-2xl font-semibold">{planPrice}</p>
                  <p className="mt-1 text-xs text-white/58">当前价</p>
                </div>
                <div className="border-l border-white/18 pl-5">
                  <p className="text-2xl font-semibold">{plan.durationDays}</p>
                  <p className="mt-1 text-xs text-white/58">天权益</p>
                </div>
                <div className="border-l border-white/18 pl-5">
                  <p className="text-2xl font-semibold">{vipCourses.length}</p>
                  <p className="mt-1 text-xs text-white/58">会员课程</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {pendingMembershipPrompts.length > 0 && (
          <CoursePendingCheckoutBanner
            prompts={pendingMembershipPrompts}
            onResume={prompt => openMembershipCheckout(prompt.checkout)}
            onCancel={handleCancelPendingCheckout}
          />
        )}

        <section className="bg-[#FFFDF8]">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-sm font-semibold text-[#6F8F83]">套餐</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                {plan.title}
              </h2>
              <p className="mt-4 max-w-[480px] text-sm leading-7 text-[#6D746F]">
                {plan.subtitle}
              </p>
              <div className="mt-7 flex items-end gap-3">
                <span className="text-5xl font-semibold text-[#A65F48]">
                  {planPrice}
                </span>
                <span className="pb-2 text-sm text-[#8A8176] line-through">
                  {originalPrice}
                </span>
              </div>
              {hasActiveMembership && (
                <p className="mt-5 rounded-lg bg-[#E7EFE8] px-4 py-3 text-sm font-semibold text-[#41675A]">
                  当前会员有效期至 {formatDate(membership.expiresAt)}
                </p>
              )}
              {isMembershipProductFallback && membershipProductError && (
                <p className="mt-4 rounded-lg bg-[#FFF4DE] px-4 py-3 text-sm text-[#8A6534]">
                  当前正在使用本地会员套餐兜底展示：{membershipProductError}
                </p>
              )}
            </motion.div>

            <div className="grid gap-3">
              {plan.benefits.map((benefit, index) => {
                const icons = [BookOpenCheck, Sparkles, HeartHandshake];
                const Icon = icons[index] ?? CheckCircle2;
                return (
                  <motion.div
                    key={benefit.title}
                    className="grid gap-4 border-t border-[#E8DED0] py-5 sm:grid-cols-[44px_1fr]"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{
                      duration: 0.42,
                      delay: index * 0.06,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E6EDDF] text-[#41675A]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">{benefit.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#6D746F]">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:px-12">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-[#6F8F83]">可学习内容</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                会员课会进入同一个成长空间
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#6D746F]">
                当前已覆盖 {vipCourses.length} 门会员课程，横跨{" "}
                {categoryCount || 0}{" "}
                个主题。后续课程商品上架后，会继续沿用同一会员权益判断。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {vipCourses.map((course, index) => (
                <motion.button
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="overflow-hidden rounded-lg border border-[#E4DCCF] bg-[#FFFDF8] text-left transition hover:-translate-y-0.5 hover:border-[#B9C8B3] hover:shadow-lg hover:shadow-[#243B35]/8"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    duration: 0.42,
                    delay: index * 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <img
                    src={course.coverUrl}
                    alt=""
                    className="h-36 w-full object-cover"
                  />
                  <div className="p-4">
                    <span className="rounded-full bg-[#F2E6C9] px-2.5 py-1 text-xs font-semibold text-[#81652C]">
                      会员可学
                    </span>
                    <h3 className="mt-3 line-clamp-2 font-semibold">
                      {course.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-[#6D746F]">
                      {course.teacher} · {course.category}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#243B35] text-white">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
            <div>
              <p className="text-sm font-semibold text-[#C7D8C2]">购买须知</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                权益、隐私和售后都走服务端状态
              </h2>
            </div>
            <div className="grid gap-4">
              {plan.protections.map((item, index) => {
                const icons = [Crown, LockKeyhole, ShieldCheck];
                const Icon = icons[index] ?? BadgePercent;
                return (
                  <div
                    key={item.title}
                    className="grid gap-4 border-t border-white/16 py-5 sm:grid-cols-[44px_1fr]"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-[#DDE8D9]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-white/62">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <div>
            <p className="text-sm font-semibold text-[#6F8F83]">准备开通</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight">
              {hasActiveMembership
                ? "会员权益已在账号内"
                : "从会员套餐开始连续学习"}
            </h2>
          </div>
          <button
            onClick={() => openMembershipCheckout()}
            disabled={isCheckoutBusy || isSyncing}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#243B35] px-6 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-70"
          >
            {isCheckoutBusy && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {hasActiveMembership ? "查看会员课程" : `${planPrice} 开通会员`}
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </section>
      </main>

      {isCheckoutOpen && (
        <CourseCheckoutDrawer
          acceptedTerms={acceptedTerms}
          checkoutError={checkoutError}
          checkoutOrder={checkoutOrder}
          isOpen={isCheckoutOpen}
          isSyncing={isSyncing}
          productImageUrl={product.heroImageUrl}
          selectedPaymentChannel={selectedPaymentChannel}
          status={checkoutStatus}
          summary={checkoutSummary}
          onAcceptedTermsChange={setAcceptedTerms}
          onCancelOrder={handleCancelCheckoutOrder}
          onClose={closeCheckout}
          onConfirm={handleConfirmCheckout}
          onPaymentChannelChange={setSelectedPaymentChannel}
          onViewOrder={orderId => {
            closeCheckout();
            navigate(`/me?tab=orders&orderId=${encodeURIComponent(orderId)}`);
          }}
          onStartLearning={() => {
            closeCheckout();
            navigate("/courses");
          }}
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
