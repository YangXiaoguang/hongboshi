import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  History,
  Loader2,
  PauseCircle,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  type LucideIcon,
} from "lucide-react";
import {
  MEMBERSHIP_PRODUCT_ADMIN_PERMISSIONS,
  userCan,
  type CourseMembershipPlan,
  type CourseMembershipProduct,
  type CourseMembershipProductAdminAuditEvent,
  type CourseMembershipProductAdminConsole,
  type CourseMembershipProductStatus,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpCourseMembershipProductRepository } from "@/features/memberships";

type ProductFormState = {
  title: string;
  subtitle: string;
  description: string;
  heroImageUrl: string;
  scopeLabel: string;
  status: CourseMembershipProductStatus;
  reason: string;
};

type PlanPriceFormState = {
  originalPrice: string;
  payablePrice: string;
  reason: string;
};

const statusCopy = {
  active: "售卖中",
  inactive: "已暂停",
} satisfies Record<CourseMembershipProductStatus, string>;

const statusTone = {
  active: "bg-[#E6EDDF] text-[#41675A]",
  inactive: "bg-[#F4E5DE] text-[#A65F48]",
} satisfies Record<CourseMembershipProductStatus, string>;

const auditActionCopy = {
  product_update: "商品信息",
  plan_update: "套餐更新",
  plan_status_update: "状态变更",
} satisfies Record<CourseMembershipProductAdminAuditEvent["action"], string>;

function formatMoney(amount: number) {
  return `¥${amount.toFixed(amount % 1 === 0 ? 0 : 1)}`;
}

function formatDate(value?: string) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function productFormFrom(product: CourseMembershipProduct): ProductFormState {
  return {
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    heroImageUrl: product.heroImageUrl,
    scopeLabel: product.scopeLabel,
    status: product.status,
    reason: "",
  };
}

function planPriceFormFrom(plan: CourseMembershipPlan): PlanPriceFormState {
  return {
    originalPrice: String(plan.originalPrice),
    payablePrice: String(plan.payablePrice),
    reason: "",
  };
}

function auditChangeText(event: CourseMembershipProductAdminAuditEvent) {
  if (event.action === "plan_status_update") {
    const before =
      typeof event.before.status === "string"
        ? statusCopy[event.before.status as CourseMembershipProductStatus]
        : "未记录";
    const after =
      typeof event.after.status === "string"
        ? statusCopy[event.after.status as CourseMembershipProductStatus]
        : "未记录";
    return `${before} -> ${after}`;
  }

  if (event.action === "plan_update") {
    const before = Number(event.before.payablePrice);
    const after = Number(event.after.payablePrice);
    if (Number.isFinite(before) && Number.isFinite(after)) {
      return `${formatMoney(before)} -> ${formatMoney(after)}`;
    }
  }

  if (event.action === "product_update") {
    const before =
      typeof event.before.title === "string" ? event.before.title : "未记录";
    const after =
      typeof event.after.title === "string" ? event.after.title : "未记录";
    return `${before} -> ${after}`;
  }

  return "已更新";
}

export default function MembershipProducts() {
  const { user } = useAuth();
  const [consoleData, setConsoleData] =
    useState<CourseMembershipProductAdminConsole>();
  const [productForm, setProductForm] = useState<ProductFormState>();
  const [planForms, setPlanForms] = useState<
    Record<string, PlanPriceFormState>
  >({});
  const [planStatusReasons, setPlanStatusReasons] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [mutatingPlanId, setMutatingPlanId] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const canManage = Boolean(
    user && userCan(user, MEMBERSHIP_PRODUCT_ADMIN_PERMISSIONS.manage)
  );

  const loadConsole = async () => {
    setIsLoading(true);
    try {
      const next =
        await httpCourseMembershipProductRepository.loadAdminConsole();
      setConsoleData(next);
      setProductForm(productFormFrom(next.product));
      setPlanForms(
        Object.fromEntries(
          next.product.plans.map(plan => [plan.id, planPriceFormFrom(plan)])
        )
      );
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "会员商品后台读取失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConsole();
  }, []);

  const activePlanCount = useMemo(
    () =>
      consoleData?.product.plans.filter(plan => plan.status === "active")
        .length ?? 0,
    [consoleData?.product.plans]
  );

  const submitProduct = async () => {
    if (!productForm || !canManage) return;
    setIsSavingProduct(true);
    try {
      await httpCourseMembershipProductRepository.updateProduct(productForm);
      await loadConsole();
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "会员商品基础信息更新失败");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const submitPlanPrice = async (plan: CourseMembershipPlan) => {
    const draft = planForms[plan.id];
    if (!draft || !canManage) return;

    setMutatingPlanId(plan.id);
    try {
      await httpCourseMembershipProductRepository.updatePlan(plan.id, {
        title: plan.title,
        subtitle: plan.subtitle,
        planName: plan.planName,
        badge: plan.badge,
        durationDays: plan.durationDays,
        originalPrice: Number(draft.originalPrice),
        payablePrice: Number(draft.payablePrice),
        benefits: plan.benefits,
        audience: plan.audience,
        protections: plan.protections,
        notices: plan.notices,
        reason: draft.reason,
      });
      await loadConsole();
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "会员套餐更新失败");
    } finally {
      setMutatingPlanId(undefined);
    }
  };

  const submitPlanStatus = async (plan: CourseMembershipPlan) => {
    if (!canManage) return;

    const nextStatus: CourseMembershipProductStatus =
      plan.status === "active" ? "inactive" : "active";
    setMutatingPlanId(plan.id);
    try {
      await httpCourseMembershipProductRepository.updatePlanStatus(plan.id, {
        status: nextStatus,
        reason: planStatusReasons[plan.id] ?? "",
      });
      await loadConsole();
      setPlanStatusReasons(previous => ({ ...previous, [plan.id]: "" }));
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "会员套餐状态更新失败");
    } finally {
      setMutatingPlanId(undefined);
    }
  };

  const product = consoleData?.product;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[#E4DCCF] bg-[#FFFDF8] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#6F8F83]">UX-Z</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#243B35]">
              会员商品
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6D746F]">
              会员从课程锚点中独立出来后，这里负责维护前台售卖的会员商品、套餐价格和上下架生命周期，所有敏感动作都进入服务端审计。
            </p>
          </div>
          <button
            onClick={loadConsole}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-65"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-[#E7C7B8] bg-[#FFF3ED] px-4 py-3 text-sm text-[#A65F48]">
            {error}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["商品状态", product ? statusCopy[product.status] : "-"],
          ["套餐数量", product?.plans.length ?? 0],
          ["可售套餐", activePlanCount],
          ["最近更新", formatDate(product?.updatedAt)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-[#E4DCCF] bg-[#FFFDF8] p-5"
          >
            <p className="text-xs font-semibold text-[#7B817C]">{label}</p>
            <p className="mt-3 break-words text-2xl font-semibold text-[#243B35]">
              {value}
            </p>
          </div>
        ))}
      </section>

      {isLoading && (
        <section className="flex min-h-[240px] items-center justify-center rounded-lg border border-[#E4DCCF] bg-[#FFFDF8] text-sm text-[#7B817C]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          正在读取会员商品
        </section>
      )}

      {!isLoading && product && productForm && (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-lg border border-[#E4DCCF] bg-[#FFFDF8]">
              <div className="flex items-center gap-3 border-b border-[#E4DCCF] px-5 py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E6EDDF] text-[#41675A]">
                  <Crown className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[#243B35]">
                    商品基础信息
                  </h2>
                  <p className="mt-1 text-xs text-[#7B817C]">
                    影响会员商品页的名称、说明、展示图和售卖状态。
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <label className="text-sm font-semibold text-[#4C5F57]">
                  商品名称
                  <input
                    value={productForm.title}
                    onChange={event =>
                      setProductForm({
                        ...productForm,
                        title: event.target.value,
                      })
                    }
                    disabled={!canManage}
                    className="mt-2 h-10 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                  />
                </label>
                <label className="text-sm font-semibold text-[#4C5F57]">
                  副标题
                  <input
                    value={productForm.subtitle}
                    onChange={event =>
                      setProductForm({
                        ...productForm,
                        subtitle: event.target.value,
                      })
                    }
                    disabled={!canManage}
                    className="mt-2 h-10 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                  />
                </label>
                <label className="md:col-span-2 text-sm font-semibold text-[#4C5F57]">
                  商品描述
                  <textarea
                    value={productForm.description}
                    onChange={event =>
                      setProductForm({
                        ...productForm,
                        description: event.target.value,
                      })
                    }
                    disabled={!canManage}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                  />
                </label>
                <label className="text-sm font-semibold text-[#4C5F57]">
                  首图 URL
                  <input
                    value={productForm.heroImageUrl}
                    onChange={event =>
                      setProductForm({
                        ...productForm,
                        heroImageUrl: event.target.value,
                      })
                    }
                    disabled={!canManage}
                    className="mt-2 h-10 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                  />
                </label>
                <label className="text-sm font-semibold text-[#4C5F57]">
                  权益范围
                  <input
                    value={productForm.scopeLabel}
                    onChange={event =>
                      setProductForm({
                        ...productForm,
                        scopeLabel: event.target.value,
                      })
                    }
                    disabled={!canManage}
                    className="mt-2 h-10 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                  />
                </label>
                <label className="text-sm font-semibold text-[#4C5F57]">
                  商品状态
                  <select
                    value={productForm.status}
                    onChange={event =>
                      setProductForm({
                        ...productForm,
                        status: event.target
                          .value as CourseMembershipProductStatus,
                      })
                    }
                    disabled={!canManage}
                    className="mt-2 h-10 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                  >
                    <option value="active">售卖中</option>
                    <option value="inactive">已暂停</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-[#4C5F57]">
                  操作原因
                  <input
                    value={productForm.reason}
                    onChange={event =>
                      setProductForm({
                        ...productForm,
                        reason: event.target.value,
                      })
                    }
                    disabled={!canManage}
                    className="mt-2 h-10 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#E4DCCF] px-5 py-4">
                <p className="text-xs text-[#7B817C]">
                  当前账号{canManage ? "可维护会员商品" : "仅可查看会员商品"}。
                </p>
                <button
                  onClick={submitProduct}
                  disabled={!canManage || isSavingProduct}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingProduct ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  保存商品
                </button>
              </div>
            </section>

            <section className="space-y-4">
              {product.plans.map(plan => {
                const draft = planForms[plan.id] ?? planPriceFormFrom(plan);
                const isMutating = mutatingPlanId === plan.id;
                const targetStatus =
                  plan.status === "active" ? "inactive" : "active";

                return (
                  <div
                    key={plan.id}
                    className="rounded-lg border border-[#E4DCCF] bg-[#FFFDF8]"
                  >
                    <div className="flex flex-col gap-3 border-b border-[#E4DCCF] px-5 py-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-[#243B35]">
                            {plan.title}
                          </h2>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              statusTone[plan.status]
                            }`}
                          >
                            {statusCopy[plan.status]}
                          </span>
                          {plan.badge && (
                            <span className="rounded-full bg-[#F2E7D7] px-2.5 py-1 text-xs font-semibold text-[#8B6F48]">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                          {plan.subtitle}
                        </p>
                      </div>
                      <div className="shrink-0 text-left md:text-right">
                        <p className="text-sm text-[#8A8176]">
                          原价 {formatMoney(plan.originalPrice)}
                        </p>
                        <p className="mt-1 text-3xl font-semibold text-[#243B35]">
                          {formatMoney(plan.payablePrice)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 p-5 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <MetricPill
                          icon={Tag}
                          label="周期"
                          value={`${plan.durationDays} 天`}
                        />
                        <MetricPill
                          icon={Sparkles}
                          label="权益"
                          value={`${plan.benefits.length} 项`}
                        />
                        <MetricPill
                          icon={ShieldCheck}
                          label="保障"
                          value={`${plan.protections.length} 项`}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-semibold text-[#4C5F57]">
                          原价
                          <input
                            type="number"
                            min="0"
                            value={draft.originalPrice}
                            onChange={event =>
                              setPlanForms(previous => ({
                                ...previous,
                                [plan.id]: {
                                  ...draft,
                                  originalPrice: event.target.value,
                                },
                              }))
                            }
                            disabled={!canManage}
                            className="mt-2 h-10 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                          />
                        </label>
                        <label className="text-sm font-semibold text-[#4C5F57]">
                          售价
                          <input
                            type="number"
                            min="0"
                            value={draft.payablePrice}
                            onChange={event =>
                              setPlanForms(previous => ({
                                ...previous,
                                [plan.id]: {
                                  ...draft,
                                  payablePrice: event.target.value,
                                },
                              }))
                            }
                            disabled={!canManage}
                            className="mt-2 h-10 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                          />
                        </label>
                        <label className="sm:col-span-2 text-sm font-semibold text-[#4C5F57]">
                          改价原因
                          <input
                            value={draft.reason}
                            onChange={event =>
                              setPlanForms(previous => ({
                                ...previous,
                                [plan.id]: {
                                  ...draft,
                                  reason: event.target.value,
                                },
                              }))
                            }
                            disabled={!canManage}
                            className="mt-2 h-10 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid gap-4 border-t border-[#E4DCCF] px-5 py-4 lg:grid-cols-[1fr_320px]">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <InfoList title="核心权益" items={plan.benefits} />
                        <InfoList
                          title="适合人群"
                          items={plan.audience.map(item => ({
                            title: item,
                            description: "会员购买人群",
                          }))}
                        />
                        <InfoList title="服务保障" items={plan.protections} />
                      </div>

                      <div className="space-y-3">
                        <button
                          onClick={() => submitPlanPrice(plan)}
                          disabled={!canManage || isMutating}
                          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isMutating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          保存价格
                        </button>
                        <input
                          value={planStatusReasons[plan.id] ?? ""}
                          onChange={event =>
                            setPlanStatusReasons(previous => ({
                              ...previous,
                              [plan.id]: event.target.value,
                            }))
                          }
                          disabled={!canManage}
                          placeholder="状态变更原因"
                          className="h-10 w-full rounded-lg border border-[#D9CFC0] bg-white px-3 text-sm outline-none transition focus:border-[#6F8F83] disabled:bg-[#F7F1E8]"
                        />
                        <button
                          onClick={() => submitPlanStatus(plan)}
                          disabled={!canManage || isMutating}
                          className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[#D8CDBE] bg-white px-4 text-sm font-semibold text-[#4C5F57] transition hover:bg-[#F8F3EA] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <PauseCircle className="mr-2 h-4 w-4" />
                          {targetStatus === "inactive"
                            ? "暂停套餐"
                            : "恢复套餐"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="overflow-hidden rounded-lg border border-[#E4DCCF] bg-[#FFFDF8]">
              <div className="flex items-center gap-2 border-b border-[#E4DCCF] px-5 py-4 text-sm font-semibold text-[#243B35]">
                <History className="h-4 w-4 text-[#6F8F83]" />
                最近审计
              </div>
              <div className="divide-y divide-[#E4DCCF]">
                {(consoleData.auditEvents.length
                  ? consoleData.auditEvents.slice(0, 8)
                  : []
                ).map(event => (
                  <div key={event.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[#E6EDDF] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
                        {auditActionCopy[event.action]}
                      </span>
                      <span className="text-xs text-[#9AA19B]">
                        {formatDate(event.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#243B35]">
                      {auditChangeText(event)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#7B817C]">
                      {event.reason}
                    </p>
                  </div>
                ))}
                {!consoleData.auditEvents.length && (
                  <div className="px-5 py-8 text-sm text-[#7B817C]">
                    暂无会员商品操作记录。
                  </div>
                )}
              </div>
            </section>
          </aside>
        </section>
      )}
    </div>
  );
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  const Icon = icon;
  return (
    <div className="rounded-lg border border-[#E4DCCF] bg-[#FBF7EF] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#7B817C]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-[#243B35]">{value}</p>
    </div>
  );
}

function InfoList({
  title,
  items,
}: {
  title: string;
  items: { title: string; description: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#243B35]">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.slice(0, 3).map(item => (
          <div
            key={item.title}
            className="rounded-lg bg-[#F8F3EA] px-3 py-2 text-xs leading-5 text-[#66716A]"
          >
            <span className="font-semibold text-[#4C5F57]">{item.title}</span>
            <span className="mt-0.5 block">{item.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
