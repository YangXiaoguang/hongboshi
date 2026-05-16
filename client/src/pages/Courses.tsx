import { useState } from "react";
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
import CourseDiscoverySection from "@/components/CourseDiscoverySection";
import CoursePathSection from "@/components/CoursePathSection";
import CourseStarterLanes from "@/components/CourseStarterLanes";
import {
  DEFAULT_COURSE_LEARNING_PATH_ID,
  getCourseDetailPrimaryActionCopy,
  getCourseLearningPath,
  useCourseAccess,
  useCourseCatalog,
  useCourseEngagement,
  type Course,
  type CourseLearningPath,
} from "@/features/courses";

const courseHeroImage =
  "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1800&q=86";

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
  const { getCourseAccess, hasActiveMembership, ownedCourseCount } =
    useCourseAccess();
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

  const getCoursePrimaryAction = (course: Course) => {
    const access = getCourseAccess(course);
    const hasStarted = Boolean(getProgress(course.id));
    const copy = getCourseDetailPrimaryActionCopy(access, hasStarted);

    if (access.canStart) {
      return {
        label: hasStarted ? "继续学习" : "开始学习",
        description: copy.description,
        tone: "learn" as const,
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
    navigate(`/courses/${course.id}?checkout=${checkoutMode}&from=shelf`);
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

      <AppFooter />
    </div>
  );
}
