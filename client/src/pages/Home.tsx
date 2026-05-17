import { useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  HeartHandshake,
  Leaf,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import CourseDiscoverySection from "@/components/CourseDiscoverySection";
import CoursePathSection from "@/components/CoursePathSection";
import MobileView from "@/components/MobileView";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_COURSE_LEARNING_PATH_ID,
  getCourseLearningPath,
  useCourseAccess,
  useCourseCatalog,
  useCourseEngagement,
  type CourseLearningPath,
} from "@/features/courses";

const heroImage =
  "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1800&q=86";

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
  "根据困扰类型推荐课程路径",
  "收藏内容，形成自己的成长清单",
];

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isLoggedIn } = useAuth();
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
    allCourses,
    setCategory,
    setType,
    setSort,
    setKeyword,
    setVipOnlyFilter,
    setCurrentPage,
  } = useCourseCatalog();
  const { favoriteCourseIds, favoriteCount, toggleFavorite } =
    useCourseEngagement({
      userId: user?.id,
      enableRemoteSync: isLoggedIn,
      favoriteSource: "home",
    });
  const { getCourseAccess, hasActiveMembership, ownedCourseCount } =
    useCourseAccess();
  const [viewMode, setViewMode] = useState<"pc" | "mobile">("pc");
  const [selectedPathId, setSelectedPathId] = useState(
    DEFAULT_COURSE_LEARNING_PATH_ID
  );

  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.35], [1, 1.08]);
  const heroY = useTransform(scrollYProgress, [0, 0.35], [0, 38]);
  const selectedPath = getCourseLearningPath(selectedPathId);

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

  if (viewMode === "mobile") {
    return (
      <div className="min-h-screen bg-[#F7F2EA] flex flex-col">
        <AppHeader />
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 pt-6 lg:px-6">
          <div>
            <p className="text-xs font-medium text-[#6F8F83]">小程序预览</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#243B35]">
              把课程学习放进日常
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
                  getCourseAccessStatus={course =>
                    getCourseAccess(course).status
                  }
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
              <h1 className="mt-6 max-w-[720px] text-4xl font-semibold leading-[1.08] text-white sm:text-6xl lg:text-7xl">
                <span className="block">从一门心理课开始</span>
                <span className="block">把成长变成日常</span>
              </h1>
              <p className="mt-6 max-w-[520px] text-base leading-8 text-white/78 sm:text-lg">
                用课程路径、测评推荐和咨询陪伴，把情绪、关系、亲子与职场压力拆成可以学习的一小步。
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => navigate("/courses")}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#DDE8D9] px-6 text-sm font-semibold text-[#20362F] transition hover:bg-white"
                >
                  浏览课程
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/assessment")}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/35 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  做测评推荐课程
                </button>
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-5 left-5 z-20 hidden items-center gap-3 text-sm font-semibold text-[#243B35] sm:left-8 sm:flex lg:left-12">
            <span className="h-px w-12 bg-[#6F8F83]" />
            下一步：浏览适合你的课程
            <ArrowRight className="h-4 w-4 rotate-90 text-[#6F8F83]" />
          </div>
        </section>

        <CoursePathSection
          courses={allCourses}
          selectedPathId={selectedPathId}
          onPathChange={applyCoursePath}
          onExplorePath={handleExploreCoursePath}
          onCourseSelect={course => navigate(`/courses/${course.id}`)}
          onAssessment={() => navigate("/assessment")}
        />

        <CourseDiscoverySection
          id="courses"
          className="bg-[#F3EDE4]"
          eyebrow="课程学习中心"
          title={selectedPath.discoveryTitle}
          description={selectedPath.discoveryDescription}
          actionSlot={
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          }
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
          onToggleFavorite={toggleFavorite}
          onCategoryChange={setCategory}
          onTypeChange={setType}
          onSortChange={setSort}
          onSearch={setKeyword}
          onVipToggle={setVipOnlyFilter}
          onPageChange={setCurrentPage}
        />

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
                {servicePaths.map(path => (
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
                      onClick={() => {
                        if (path.action === "预约咨询") {
                          navigate("/consulting");
                          return;
                        }
                        if (path.action === "开始评估") {
                          navigate("/assessment");
                          return;
                        }
                        navigate("/courses");
                      }}
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
                <p className="text-sm font-semibold text-[#DDE8D9]">
                  成长不是一次完成
                </p>
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
                    <p className="pt-1 text-base font-medium text-[#394A44]">
                      {item}
                    </p>
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
