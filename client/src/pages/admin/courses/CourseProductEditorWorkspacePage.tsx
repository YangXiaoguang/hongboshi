import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronLeft,
  FileImage,
  FilePenLine,
  Layers3,
  Loader2,
  PanelRight,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  COURSE_CATEGORIES,
  COURSE_TYPES,
  type CourseCategory,
  type CourseProductCreateRequest,
  type CourseProductListItem,
  type CourseProductPriceUpdateRequest,
  type CourseType,
} from "@shared/domain";
import { useAuth } from "@/contexts/AuthContext";
import { httpCourseProductRepository } from "@/features/catalog";
import { getCourseProductAdminPermissions } from "@/features/catalog/model/courseProductAdminPermissions";
import {
  courseProductReviewCopy,
  courseProductStatusCopy,
} from "./courseProductAdminLabels";

type WorkspaceStepId = "basic" | "media" | "price" | "content" | "publish";

type BasicFormState = {
  title: string;
  coverUrl: string;
  category: CourseCategory;
  type: CourseType;
  instructorName: string;
  learners: string;
};

type PriceFormState = {
  amount: string;
  originalAmount: string;
  isFree: boolean;
  memberIncluded: boolean;
};

const defaultCoverUrl =
  "https://images.unsplash.com/photo-1499209974431-9dddcece7f88";

const workspaceSteps: {
  id: WorkspaceStepId;
  label: string;
  description: string;
}[] = [
  {
    id: "basic",
    label: "基础信息",
    description: "标题、分类、讲师和学习人数",
  },
  {
    id: "media",
    label: "商品图片",
    description: "主图、详情图和证明图资产",
  },
  {
    id: "price",
    label: "价格权益",
    description: "售价、原价、会员权益",
  },
  {
    id: "content",
    label: "H5 详情",
    description: "成交内容、章节和移动端预览",
  },
  {
    id: "publish",
    label: "发布审核",
    description: "完整度、审核和上架状态",
  },
];

function defaultBasicForm(): BasicFormState {
  return {
    title: "",
    coverUrl: defaultCoverUrl,
    category: COURSE_CATEGORIES[0],
    type: COURSE_TYPES[0],
    instructorName: "",
    learners: "0",
  };
}

function defaultPriceForm(): PriceFormState {
  return {
    amount: "199",
    originalAmount: "399",
    isFree: false,
    memberIncluded: false,
  };
}

function basicFormFromProduct(product: CourseProductListItem): BasicFormState {
  return {
    title: product.title,
    coverUrl: product.coverUrl,
    category: product.category,
    type: product.type,
    instructorName: product.instructorName,
    learners: String(product.learners),
  };
}

function priceFormFromProduct(product: CourseProductListItem): PriceFormState {
  return {
    amount: String(product.price.amount),
    originalAmount: String(product.price.originalAmount),
    isFree: product.price.isFree,
    memberIncluded: product.price.memberIncluded,
  };
}

function parseLearners(value: string) {
  const learners = Number(value);
  return Number.isInteger(learners) && learners >= 0 ? learners : undefined;
}

function parsePrice(form: PriceFormState) {
  const amount = form.isFree ? 0 : Number(form.amount);
  const originalAmount = Number(form.originalAmount || amount);
  if (!Number.isFinite(amount) || !Number.isFinite(originalAmount)) {
    return undefined;
  }
  return {
    amount,
    originalAmount,
    isFree: form.isFree,
    memberIncluded: form.memberIncluded,
  };
}

function productCompleteness(product?: CourseProductListItem) {
  if (!product) return { completed: 0, total: 5, label: "0/5" };
  const checks = [
    product.title.trim().length >= 2,
    product.coverUrl.trim().length > 8,
    product.instructorName.trim().length >= 1,
    product.price.isFree || product.price.amount > 0,
    product.status !== "archived",
  ];
  const completed = checks.filter(Boolean).length;
  return {
    completed,
    total: checks.length,
    label: `${completed}/${checks.length}`,
  };
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[#E5DCCF] bg-[#FFFDF8] px-5 py-5 last:border-b-0">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#243B35]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#6F7771]">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function CourseProductEditorWorkspacePage() {
  const [, navigate] = useLocation();
  const [isNewRoute] = useRoute("/admin/courses/new");
  const [, editParams] = useRoute("/admin/courses/:courseId/edit");
  const { user, isLoggedIn, isAuthSyncing } = useAuth();
  const [activeStep, setActiveStep] = useState<WorkspaceStepId>("basic");
  const [product, setProduct] = useState<CourseProductListItem>();
  const [basicForm, setBasicForm] = useState<BasicFormState>(defaultBasicForm);
  const [priceForm, setPriceForm] = useState<PriceFormState>(defaultPriceForm);
  const [reason, setReason] = useState("新增课程商品草稿");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [actionMessage, setActionMessage] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const courseId = editParams?.courseId;
  const isNew = Boolean(isNewRoute);
  const catalogPermissions = useMemo(
    () => getCourseProductAdminPermissions(user),
    [user]
  );
  const completeness = productCompleteness(product);

  const loadProduct = useCallback(async () => {
    if (!courseId) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await httpCourseProductRepository.loadCourseProducts({
        keyword: courseId,
        page: 1,
        pageSize: 50,
      });
      const matched = result.items.find(
        item => String(item.courseId) === String(courseId)
      );
      if (!matched) {
        setError("未找到对应课程商品");
        return;
      }
      setProduct(matched);
      setBasicForm(basicFormFromProduct(matched));
      setPriceForm(priceFormFromProduct(matched));
      setReason("运营工作台更新课程商品");
    } catch (err) {
      setError(err instanceof Error ? err.message : "课程商品读取失败");
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) return;
    if (isNew) {
      setProduct(undefined);
      setBasicForm(defaultBasicForm());
      setPriceForm(defaultPriceForm());
      setReason("新增课程商品草稿");
      return;
    }
    void loadProduct();
  }, [
    catalogPermissions.canRead,
    isAuthSyncing,
    isLoggedIn,
    isNew,
    loadProduct,
  ]);

  const submitCreate = useCallback(async () => {
    if (!catalogPermissions.canEdit) {
      setActionError("当前账号暂无课程商品编辑权限");
      return;
    }
    const learners = parseLearners(basicForm.learners);
    const price = parsePrice(priceForm);
    if (learners === undefined) {
      setActionError("请填写有效的学习人数");
      return;
    }
    if (!price) {
      setActionError("请填写有效的课程价格");
      return;
    }
    const request: CourseProductCreateRequest = {
      ...basicForm,
      learners,
      price,
      reason,
    };
    setIsSaving(true);
    setActionError(undefined);
    setActionMessage(undefined);
    try {
      const result =
        await httpCourseProductRepository.createCourseProduct(request);
      setActionMessage("课程商品草稿已创建");
      navigate(`/admin/courses/${result.product.courseId}/edit?created=1`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "课程商品创建失败");
    } finally {
      setIsSaving(false);
    }
  }, [basicForm, catalogPermissions.canEdit, navigate, priceForm, reason]);

  const submitBasicUpdate = useCallback(async () => {
    if (!product) return;
    if (!catalogPermissions.canEdit) {
      setActionError("当前账号暂无课程商品编辑权限");
      return;
    }
    const learners = parseLearners(basicForm.learners);
    if (learners === undefined) {
      setActionError("请填写有效的学习人数");
      return;
    }
    setIsSaving(true);
    setActionError(undefined);
    setActionMessage(undefined);
    try {
      const result =
        await httpCourseProductRepository.updateCourseProductBasicInfo(
          product.id,
          {
            ...basicForm,
            learners,
            reason,
          }
        );
      setProduct(result.product);
      setActionMessage("课程商品基础信息已保存");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品基础信息保存失败"
      );
    } finally {
      setIsSaving(false);
    }
  }, [basicForm, catalogPermissions.canEdit, product, reason]);

  const submitPriceUpdate = useCallback(async () => {
    if (!product) return;
    if (!catalogPermissions.canPrice) {
      setActionError("当前账号暂无课程商品价格权限");
      return;
    }
    const price = parsePrice(priceForm);
    if (!price) {
      setActionError("请填写有效的课程价格");
      return;
    }
    const request: CourseProductPriceUpdateRequest = {
      ...price,
      reason,
    };
    setIsSaving(true);
    setActionError(undefined);
    setActionMessage(undefined);
    try {
      const result = await httpCourseProductRepository.updateCourseProductPrice(
        product.id,
        request
      );
      setProduct(result.product);
      setActionMessage("课程商品价格权益已保存");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "课程商品价格保存失败"
      );
    } finally {
      setIsSaving(false);
    }
  }, [catalogPermissions.canPrice, priceForm, product, reason]);

  if (isAuthSyncing || !isLoggedIn || !catalogPermissions.canRead) {
    return null;
  }

  const savePrimaryAction = isNew ? submitCreate : submitBasicUpdate;

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <button
            onClick={() => navigate("/admin/courses")}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-[#FFFDF8] px-3 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
          >
            <ChevronLeft className="h-4 w-4" />
            返回商品中心
          </button>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            课程商品工作台
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            {isNew ? "新增课程商品" : product?.title || "编辑课程商品"}
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            按电商商品发布链路维护基础资料、商品图片、价格权益、H5
            详情和发布审核。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {product && (
            <button
              onClick={() => navigate(`/admin/courses/${product.courseId}`)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#CFC4B5] bg-[#FFFDF8] px-4 text-sm font-semibold text-[#355F51] transition hover:border-[#9FB3A9]"
            >
              <FilePenLine className="h-4 w-4" />
              内容详情
            </button>
          )}
          <button
            onClick={() => void savePrimaryAction()}
            disabled={
              isSaving ||
              !catalogPermissions.canEdit ||
              basicForm.title.trim().length < 2 ||
              basicForm.instructorName.trim().length < 1 ||
              reason.trim().length < 4
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isNew ? (
              <Plus className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isNew ? "创建草稿" : "保存基础信息"}
          </button>
        </div>
      </section>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#EDCDBF] bg-[#FFF4EF] px-4 py-3 text-sm text-[#A65F48]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {actionError && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#EDCDBF] bg-[#FFF4EF] px-4 py-3 text-sm text-[#A65F48]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionMessage && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#C8D8C8] bg-[#EEF6ED] px-4 py-3 text-sm text-[#41675A]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 flex min-h-[420px] items-center justify-center text-sm text-[#6F7771]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          正在读取课程商品
        </div>
      ) : (
        <div className="mt-6 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <aside className="h-fit overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8]">
            {workspaceSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex w-full items-start gap-3 border-b border-[#E8DED0] px-4 py-4 text-left last:border-b-0 ${
                  activeStep === step.id ? "bg-[#EEF6ED]" : "hover:bg-[#FBF7EF]"
                }`}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#243B35] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#243B35]">
                    {step.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#8A8176]">
                    {step.description}
                  </span>
                </span>
              </button>
            ))}
          </aside>

          <motion.main
            key={activeStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8]"
          >
            {activeStep === "basic" && (
              <SectionShell
                title="基础信息"
                description="面向课程货架、搜索、订单和详情页使用的核心商品资料。"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold text-[#41524B]">
                    课程标题
                    <input
                      value={basicForm.title}
                      onChange={event =>
                        setBasicForm(current => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="例如：压力管理进阶训练"
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                    />
                  </label>
                  <label className="text-sm font-semibold text-[#41524B]">
                    讲师
                    <input
                      value={basicForm.instructorName}
                      onChange={event =>
                        setBasicForm(current => ({
                          ...current,
                          instructorName: event.target.value,
                        }))
                      }
                      placeholder="例如：周老师"
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition placeholder:text-[#A39A90] focus:border-[#6F8F83]"
                    />
                  </label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-[#41524B]">
                  封面图 URL
                  <input
                    value={basicForm.coverUrl}
                    onChange={event =>
                      setBasicForm(current => ({
                        ...current,
                        coverUrl: event.target.value,
                      }))
                    }
                    className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                  />
                </label>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="text-sm font-semibold text-[#41524B]">
                    分类
                    <select
                      value={basicForm.category}
                      onChange={event =>
                        setBasicForm(current => ({
                          ...current,
                          category: event.target.value as CourseCategory,
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                    >
                      {COURSE_CATEGORIES.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-[#41524B]">
                    类型
                    <select
                      value={basicForm.type}
                      onChange={event =>
                        setBasicForm(current => ({
                          ...current,
                          type: event.target.value as CourseType,
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                    >
                      {COURSE_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-[#41524B]">
                    学习人数
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={basicForm.learners}
                      onChange={event =>
                        setBasicForm(current => ({
                          ...current,
                          learners: event.target.value,
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                    />
                  </label>
                </div>
              </SectionShell>
            )}

            {activeStep === "media" && (
              <SectionShell
                title="商品图片"
                description="当前先承接主图管理，后续扩展为主图、详情图、证明图和视频的素材矩阵。"
              >
                <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <div className="overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#F8F3EA]">
                    <img
                      src={basicForm.coverUrl}
                      alt={basicForm.title || "课程商品主图"}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#41524B]">
                      <FileImage className="h-4 w-4 text-[#6F8F83]" />
                      主图资产
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                      主图会同步用于课程列表、商品详情首屏和分享卡片。
                    </p>
                    <button
                      onClick={() =>
                        product
                          ? navigate(`/admin/courses/${product.courseId}`)
                          : setActiveStep("basic")
                      }
                      className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-[#CFC4B5] bg-white px-4 text-sm font-semibold text-[#41524B] transition hover:border-[#9FB3A9]"
                    >
                      <Layers3 className="h-4 w-4" />
                      {product ? "管理详情素材" : "先填写基础信息"}
                    </button>
                  </div>
                </div>
              </SectionShell>
            )}

            {activeStep === "price" && (
              <SectionShell
                title="价格权益"
                description="课程商品售卖金额、划线价和会员权益入口。"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-semibold text-[#41524B]">
                    售价
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={priceForm.isFree}
                      value={priceForm.amount}
                      onChange={event =>
                        setPriceForm(current => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83] disabled:bg-[#F4EFE7] disabled:text-[#9A8F82]"
                    />
                  </label>
                  <label className="text-sm font-semibold text-[#41524B]">
                    原价
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={priceForm.originalAmount}
                      onChange={event =>
                        setPriceForm(current => ({
                          ...current,
                          originalAmount: event.target.value,
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
                    />
                  </label>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-lg border border-[#E1D7C8] bg-white px-3 py-2 text-sm font-semibold text-[#41524B]">
                    <input
                      type="checkbox"
                      checked={priceForm.isFree}
                      onChange={event =>
                        setPriceForm(current => ({
                          ...current,
                          isFree: event.target.checked,
                          amount: event.target.checked ? "0" : current.amount,
                        }))
                      }
                    />
                    免费课程
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border border-[#E1D7C8] bg-white px-3 py-2 text-sm font-semibold text-[#41524B]">
                    <input
                      type="checkbox"
                      checked={priceForm.memberIncluded}
                      onChange={event =>
                        setPriceForm(current => ({
                          ...current,
                          memberIncluded: event.target.checked,
                        }))
                      }
                    />
                    会员权益内
                  </label>
                </div>
                {!isNew && (
                  <button
                    onClick={() => void submitPriceUpdate()}
                    disabled={
                      isSaving ||
                      !catalogPermissions.canPrice ||
                      reason.trim().length < 4
                    }
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    保存价格权益
                  </button>
                )}
              </SectionShell>
            )}

            {activeStep === "content" && (
              <SectionShell
                title="H5 详情"
                description="详情页内容、成交图文和章节资料将在这里逐步升级为富文本与移动端预览工作流。"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-[640px]">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#41524B]">
                      <PanelRight className="h-4 w-4 text-[#6F8F83]" />
                      移动端详情承载
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#6F7771]">
                      当前可进入既有内容详情页维护摘要、成交素材和章节资料；下一阶段接入富文本
                      H5 编辑器。
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      product
                        ? navigate(`/admin/courses/${product.courseId}`)
                        : setActiveStep("basic")
                    }
                    className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
                  >
                    <FilePenLine className="h-4 w-4" />
                    {product ? "打开内容详情" : "创建后编辑详情"}
                  </button>
                </div>
              </SectionShell>
            )}

            {activeStep === "publish" && (
              <SectionShell
                title="发布审核"
                description="商品创建后默认进入草稿和未提交审核，发布前必须完成内容与素材校验。"
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="border border-[#E1D7C8] bg-[#FBF7EF] px-4 py-3">
                    <p className="text-xs text-[#8A8176]">商品完整度</p>
                    <p className="mt-2 text-xl font-semibold text-[#243B35]">
                      {completeness.label}
                    </p>
                  </div>
                  <div className="border border-[#E1D7C8] bg-[#FBF7EF] px-4 py-3">
                    <p className="text-xs text-[#8A8176]">上架状态</p>
                    <p className="mt-2 text-xl font-semibold text-[#243B35]">
                      {product
                        ? courseProductStatusCopy[product.status]
                        : "待创建"}
                    </p>
                  </div>
                  <div className="border border-[#E1D7C8] bg-[#FBF7EF] px-4 py-3">
                    <p className="text-xs text-[#8A8176]">审核状态</p>
                    <p className="mt-2 text-xl font-semibold text-[#243B35]">
                      {product
                        ? courseProductReviewCopy[product.reviewStatus]
                        : "待创建"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#C8D8C8] bg-[#EEF6ED] px-4 py-3 text-sm text-[#41675A]">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    审核、上架和批量发布动作继续由商品中心承接，避免新建流程绕过运营复核。
                  </span>
                </div>
              </SectionShell>
            )}
          </motion.main>

          <aside className="h-fit rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] px-4 py-4">
            <p className="text-sm font-semibold text-[#243B35]">发布面板</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-[#E1D7C8]">
              <img
                src={basicForm.coverUrl}
                alt={basicForm.title || "课程商品主图"}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="bg-[#FBF7EF] px-3 py-3">
                <p className="line-clamp-2 text-sm font-semibold text-[#243B35]">
                  {basicForm.title || "未命名课程商品"}
                </p>
                <p className="mt-1 text-xs text-[#8A8176]">
                  {basicForm.category} · {basicForm.type}
                </p>
              </div>
            </div>
            <label className="mt-4 block text-sm font-semibold text-[#41524B]">
              操作原因
              <textarea
                value={reason}
                onChange={event => setReason(event.target.value)}
                className="mt-2 min-h-[92px] w-full rounded-lg border border-[#D8CEC0] bg-white px-3 py-2 text-sm font-normal outline-none transition focus:border-[#6F8F83]"
              />
            </label>
            <div className="mt-4 space-y-2 text-xs leading-5 text-[#8A8176]">
              <p>课程 ID：{product?.courseId ?? "创建后生成"}</p>
              <p>
                商品状态：
                {product
                  ? courseProductStatusCopy[product.status]
                  : "草稿待创建"}
              </p>
              <p>
                审核状态：
                {product
                  ? courseProductReviewCopy[product.reviewStatus]
                  : "未提交"}
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
