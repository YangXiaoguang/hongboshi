import { useMemo, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  HeartHandshake,
  Leaf,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import CourseCard from "@/components/CourseCard";
import CourseFilter from "@/components/CourseFilter";
import CourseToolbar from "@/components/CourseToolbar";
import MobileView from "@/components/MobileView";
import {
  mockCourseRepository,
  useCourseCatalog,
  useCourseEngagement,
  type CourseCategory,
} from "@/features/courses";

const heroImage =
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1800&q=86";

const supportNeeds = [
  {
    label: "情绪低落",
    title: "先稳定情绪，再慢慢看见自己",
    description: "适合从情绪管理、正念和心理科普开始。",
    category: "情绪管理",
  },
  {
    label: "关系困扰",
    title: "把关系里的反复拉扯说清楚",
    description: "适合亲密关系、婚姻关系和家庭沟通主题。",
    category: "婚姻关系",
  },
  {
    label: "亲子压力",
    title: "在教育焦虑里重新找到连接",
    description: "适合家庭教育和青少年心理课程。",
    category: "家庭教育",
  },
  {
    label: "职场耗竭",
    title: "恢复边界感与心理韧性",
    description: "适合职场心理、压力管理和个人成长主题。",
    category: "职场心理",
  },
  {
    label: "睡眠焦虑",
    title: "让身体重新学会放松",
    description: "适合正念冥想和情绪调节练习。",
    category: "正念冥想",
  },
  {
    label: "自我怀疑",
    title: "用更温和的方式理解自己",
    description: "适合个人成长、认知行为和心理科普主题。",
    category: "个人成长",
  },
] satisfies Array<{
  label: string;
  title: string;
  description: string;
  category: CourseCategory;
}>;

const servicePaths = [
  {
    icon: HeartHandshake,
    title: "一对一咨询",
    description: "匹配适合的咨询师，在安全、私密的空间里梳理真实困扰。",
    action: "预约咨询",
  },
  {
    icon: ClipboardList,
    title: "心理测评",
    description: "先了解当下状态，再决定是咨询、课程，还是持续自助练习。",
    action: "开始评估",
  },
  {
    icon: Leaf,
    title: "主题课程",
    description: "围绕情绪、关系、亲子和职场压力，建立可持续的成长节奏。",
    action: "查看课程",
  },
];

const featuredJourney = [
  "7 分钟完成初步心理状态评估",
  "根据困扰类型推荐咨询或课程路径",
  "收藏内容，形成自己的成长清单",
];

export default function Home() {
  const [, navigate] = useLocation();
  const {
    selectedCategory,
    selectedType,
    activeSort,
    vipOnly,
    currentPage,
    totalPages,
    filteredCourses,
    paginatedCourses,
    totalCount,
    pageNumbers,
    setCategory,
    setType,
    setSort,
    setKeyword,
    setVipOnlyFilter,
    setCurrentPage,
  } = useCourseCatalog();
  const { favoriteCourseIds, favoriteCount, toggleFavorite } = useCourseEngagement();
  const [viewMode, setViewMode] = useState<"pc" | "mobile">("pc");
  const [selectedNeed, setSelectedNeed] = useState(supportNeeds[0]);

  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.35], [1, 1.08]);
  const heroY = useTransform(scrollYProgress, [0, 0.35], [0, 38]);

  const recommendedCourses = useMemo(() => {
    return mockCourseRepository.listRecommendedCourses(selectedNeed.category);
  }, [selectedNeed.category]);

  const handleNeedSelect = (need: (typeof supportNeeds)[number]) => {
    setSelectedNeed(need);
    setCategory(need.category);
    setType("全部");
  };

  if (viewMode === "mobile") {
    return (
      <div className="min-h-screen bg-[#F7F2EA] flex flex-col">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 pt-6 lg:px-6">
          <div>
            <p className="text-xs font-medium text-[#6F8F83]">小程序预览</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#243B35]">
              把心理支持放进日常
            </h1>
          </div>
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        </div>

        <div className="flex flex-1 items-start justify-center px-4 py-8">
          <div className="relative">
            <div className="absolute -inset-5 rounded-[56px] bg-[#DDE8D9]" />
            <div className="relative h-[812px] w-[375px] overflow-hidden rounded-[40px] border-[8px] border-[#243B35] bg-gray-50 shadow-2xl shadow-[#243B35]/20">
              <div className="absolute left-1/2 top-0 z-10 h-[28px] w-[120px] -translate-x-1/2 rounded-b-2xl bg-black" />
              <div className="h-full w-full overflow-y-auto bg-gray-50">
                <MobileView
                  courses={filteredCourses}
                  selectedCategory={selectedCategory}
                  selectedType={selectedType}
                  onCategoryChange={setCategory}
                  onTypeChange={setType}
                  favorites={favoriteCourseIds}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            </div>
          </div>
        </div>

        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
      <AppHeader />

      <main>
        <section className="relative isolate min-h-[590px] overflow-hidden lg:min-h-[calc(100svh-180px)]">
          <motion.img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ scale: heroScale, y: heroY }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#13211D]/86 via-[#243B35]/52 to-[#F9F5EE]/10" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F9F5EE] to-transparent" />

          <div className="relative z-10 flex min-h-[590px] items-center px-5 py-14 sm:px-8 lg:min-h-[calc(100svh-180px)] lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[680px]"
            >
              <p className="text-sm font-semibold tracking-[0.28em] text-[#DDE8D9]">
                红博士心理小讲堂
              </p>
              <h1 className="mt-6 max-w-[640px] text-5xl font-semibold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
                把难说出口的事，慢慢说出来
              </h1>
              <p className="mt-6 max-w-[520px] text-base leading-8 text-white/78 sm:text-lg">
                专业咨询、心理课程与成长陪伴，为每一次低谷提供可抵达的支持。
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() =>
                    toast("预约咨询", {
                      description: "咨询师匹配流程即将上线，可先浏览适合的主题课程。",
                    })
                  }
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#DDE8D9] px-6 text-sm font-semibold text-[#20362F] transition hover:bg-white"
                >
                  预约咨询
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <button
                  onClick={() =>
                    toast("心理评估", {
                      description: "评估模块即将上线，当前可先通过困扰类型获得推荐路径。",
                    })
                  }
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/35 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  先做心理评估
                </button>
              </div>

              <div className="mt-12 grid max-w-[560px] grid-cols-3 divide-x divide-white/20 border-y border-white/18 py-5 text-white/82">
                {[
                  ["24", "主题课程"],
                  ["3", "成长路径"],
                  ["私密", "支持体验"],
                ].map(([value, label]) => (
                  <div key={label} className="px-4 first:pl-0">
                    <div className="text-2xl font-semibold text-white">{value}</div>
                    <div className="mt-1 text-xs">{label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-5 left-5 z-20 hidden items-center gap-3 text-sm font-semibold text-[#243B35] sm:left-8 sm:flex lg:left-12">
            <span className="h-px w-12 bg-[#6F8F83]" />
            下一步：选择你最近的状态
            <ArrowRight className="h-4 w-4 rotate-90 text-[#6F8F83]" />
          </div>
        </section>

        <section className="px-5 pb-14 pt-8 sm:px-8 sm:pb-16 sm:pt-10 lg:px-12">
          <div className="mx-auto max-w-[1200px]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55 }}
              className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]"
            >
              <div>
                <p className="text-sm font-semibold text-[#6F8F83]">从真实困扰开始</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35] sm:text-4xl">
                  你最近最需要被照顾的是哪一部分？
                </h2>
                <p className="mt-5 max-w-[430px] text-sm leading-7 text-[#6D746F]">
                  不必先知道答案。选择一个更接近当下的状态，我们会把课程和支持路径整理得更清楚。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {supportNeeds.map((need) => {
                  const active = selectedNeed.label === need.label;
                  return (
                    <button
                      key={need.label}
                      onClick={() => handleNeedSelect(need)}
                      className={`group min-h-[118px] rounded-[22px] border px-5 py-4 text-left transition duration-300 ${
                        active
                          ? "border-[#6F8F83] bg-[#EEF4EA] text-[#243B35]"
                          : "border-[#E4DCCF] bg-white/45 text-[#55605A] hover:border-[#AFC2AB] hover:bg-white/75"
                      }`}
                    >
                      <span className="text-sm font-semibold">{need.label}</span>
                      <span className="mt-3 block text-lg font-semibold leading-snug">
                        {need.title}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-[#7B817C]">
                        {need.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mt-10 border-y border-[#E4DCCF] py-7"
            >
              <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">推荐路径</p>
                  <h3 className="mt-3 text-2xl font-semibold text-[#243B35]">
                    {selectedNeed.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#6D746F]">
                    {selectedNeed.description}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {recommendedCourses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="group border-l border-[#DCD3C4] pl-5 text-left"
                    >
                      <span className="text-xs font-medium text-[#6F8F83]">
                        {course.category}
                      </span>
                      <span className="mt-2 line-clamp-2 block text-base font-semibold leading-snug text-[#243B35] group-hover:text-[#5F7F73]">
                        {course.title}
                      </span>
                      <span className="mt-3 inline-flex items-center text-xs font-semibold text-[#8C6E4A]">
                        查看适合原因
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-[#243B35] px-5 py-20 text-white sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1200px]">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-sm font-semibold text-[#BFD0B8]">三种入口</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                  不同状态，选择不同支持方式
                </h2>
              </div>

              <div className="grid gap-8 md:grid-cols-3">
                {servicePaths.map((path) => (
                  <motion.div
                    key={path.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.45 }}
                    className="border-t border-white/18 pt-6"
                  >
                    <path.icon className="h-6 w-6 text-[#BFD0B8]" />
                    <h3 className="mt-5 text-xl font-semibold">{path.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/68">
                      {path.description}
                    </p>
                    <button
                      onClick={() => toast(path.action, { description: "功能即将上线" })}
                      className="mt-6 inline-flex items-center text-sm font-semibold text-[#DDE8D9]"
                    >
                      {path.action}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[420px] overflow-hidden rounded-[32px]">
              <img
                src="https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1200&q=84"
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#243B35]/72 to-transparent" />
              <div className="absolute bottom-7 left-7 right-7 text-white">
                <p className="text-sm font-semibold text-[#DDE8D9]">成长不是一次完成</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight">
                  把支持变成可持续的日常节奏
                </h2>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <p className="text-sm font-semibold text-[#6F8F83]">推荐流程</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35] sm:text-4xl">
                从一次评估，到一段稳定的成长计划
              </h2>
              <div className="mt-8 divide-y divide-[#E4DCCF] border-y border-[#E4DCCF]">
                {featuredJourney.map((item, index) => (
                  <div key={item} className="flex items-start gap-5 py-5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDE8D9] text-sm font-semibold text-[#243B35]">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-base font-medium text-[#394A44]">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-[#5F6B64]">
                  <ShieldCheck className="mr-2 h-4 w-4 text-[#6F8F83]" />
                  隐私优先
                </span>
                <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-[#5F6B64]">
                  <MessageCircle className="mr-2 h-4 w-4 text-[#6F8F83]" />
                  适合开口
                </span>
                <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-[#5F6B64]">
                  <CalendarCheck className="mr-2 h-4 w-4 text-[#6F8F83]" />
                  持续陪伴
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F3EDE4] px-5 py-16 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full bg-[#DDE8D9] px-4 py-2 text-xs font-semibold text-[#41675A]">
                  <Sparkles className="mr-2 h-4 w-4" />
                  成长内容库
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-[#243B35]">
                  按你的节奏学习心理成长
                </h2>
                <p className="mt-3 max-w-[620px] text-sm leading-7 text-[#6D746F]">
                  这里保留完整课程发现能力，但去掉过度促销感，把重点放回适合谁、解决什么问题。
                </p>
                {favoriteCount > 0 && (
                  <p className="mt-3 inline-flex rounded-full bg-[#FFFDF8]/80 px-4 py-2 text-xs font-semibold text-[#8C6E4A]">
                    已收藏 {favoriteCount} 门课程
                  </p>
                )}
              </div>
              <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
            </div>

            <CourseFilter
              selectedCategory={selectedCategory}
              selectedType={selectedType}
              onCategoryChange={setCategory}
              onTypeChange={setType}
            />

            <div className="mt-6">
              <CourseToolbar
                activeSort={activeSort}
                onSortChange={setSort}
                onSearch={setKeyword}
                vipOnly={vipOnly}
                onVipToggle={setVipOnlyFilter}
                totalCount={totalCount}
              />
            </div>

            <div className="mt-8">
              {paginatedCourses.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {paginatedCourses.map((course, i) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      index={i}
                      isFavorited={favoriteCourseIds.has(course.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <p className="text-sm text-[#7B817C]">
                    暂无匹配的课程，请尝试调整筛选条件
                  </p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-1">
                <PageButton
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  icon={<ChevronsLeft className="h-4 w-4" />}
                />
                <PageButton
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  icon={<ChevronLeft className="h-4 w-4" />}
                />

                {pageNumbers.map((page, i) =>
                  page === "..." ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="flex h-9 w-9 items-center justify-center text-sm text-[#9AA19B]"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm transition ${
                        currentPage === page
                          ? "bg-[#6F8F83] font-semibold text-white"
                          : "text-[#6D746F] hover:bg-white/70"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <PageButton
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  icon={<ChevronRight className="h-4 w-4" />}
                />
                <PageButton
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  icon={<ChevronsRight className="h-4 w-4" />}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: "pc" | "mobile";
  onChange: (mode: "pc" | "mobile") => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-[#DCD3C4] bg-white/70 p-1 shadow-sm shadow-[#243B35]/5 backdrop-blur">
      <button
        onClick={() => onChange("pc")}
        className={`inline-flex items-center rounded-full px-3.5 py-2 text-xs font-semibold transition ${
          viewMode === "pc"
            ? "bg-[#243B35] text-white"
            : "text-[#6D746F] hover:text-[#243B35]"
        }`}
      >
        <Monitor className="mr-1.5 h-3.5 w-3.5" />
        PC端
      </button>
      <button
        onClick={() => onChange("mobile")}
        className={`inline-flex items-center rounded-full px-3.5 py-2 text-xs font-semibold transition ${
          viewMode === "mobile"
            ? "bg-[#243B35] text-white"
            : "text-[#6D746F] hover:text-[#243B35]"
        }`}
      >
        <Smartphone className="mr-1.5 h-3.5 w-3.5" />
        小程序端
      </button>
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  icon,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[#7B817C] transition hover:bg-white/70 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {icon}
    </button>
  );
}
