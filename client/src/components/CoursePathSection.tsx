import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Sparkles,
  Target,
} from "lucide-react";
import {
  courseLearningPaths,
  getCourseLearningPath,
  getCoursesForLearningPath,
  type Course,
  type CourseLearningPath,
  type CourseLearningPathId,
} from "@/features/courses";

interface CoursePathSectionProps {
  id?: string;
  className?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  courses: Course[];
  selectedPathId: CourseLearningPathId;
  onPathChange: (path: CourseLearningPath) => void;
  onExplorePath: (path: CourseLearningPath) => void;
  onCourseSelect: (course: Course) => void;
  getCourseAction?: (course: Course) => {
    label: string;
    description: string;
  };
  onCourseAction?: (course: Course) => void;
  onAssessment?: () => void;
}

function formatPrice(course: Course): string {
  return course.isFree ? "免费" : `¥${course.price.toFixed(1)}`;
}

export default function CoursePathSection({
  id = "course-paths",
  className = "bg-[#FFFDF8]",
  eyebrow = "推荐学习路径",
  title = "先按当前困扰选择一条课程路径",
  description = "路径会同步筛选下方课程列表，也可以直接进入路径里的重点课程。",
  courses,
  selectedPathId,
  onPathChange,
  onExplorePath,
  onCourseSelect,
  getCourseAction,
  onCourseAction,
  onAssessment,
}: CoursePathSectionProps) {
  const activePath = getCourseLearningPath(selectedPathId);
  const pathCourses = getCoursesForLearningPath(courses, activePath, 4);

  return (
    <section id={id} className={`${className} px-5 py-16 sm:px-8 lg:px-12`}>
      <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="self-start lg:sticky lg:top-24">
          <p className="text-sm font-semibold text-[#6F8F83]">{eyebrow}</p>
          <h2 className="mt-3 max-w-[440px] text-3xl font-semibold leading-tight text-[#243B35] sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 max-w-[420px] text-sm leading-7 text-[#6D746F]">
            {description}
          </p>

          <div className="mt-8 divide-y divide-[#E4DCCF] border-y border-[#E4DCCF]">
            {courseLearningPaths.map(path => {
              const active = path.id === activePath.id;
              return (
                <motion.button
                  key={path.id}
                  layout
                  onClick={() => onPathChange(path)}
                  className={`group flex w-full items-start justify-between gap-5 py-4 text-left transition ${
                    active ? "text-[#243B35]" : "text-[#6D746F]"
                  }`}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.18 }}
                >
                  <span>
                    <span
                      className={`block text-sm font-semibold ${
                        active ? "text-[#41675A]" : "text-[#8A918B]"
                      }`}
                    >
                      {path.label}
                    </span>
                    <span className="mt-1 block text-base font-semibold leading-snug">
                      {path.title}
                    </span>
                  </span>
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full transition ${
                      active ? "bg-[#6F8F83]" : "bg-[#D8CDBD]"
                    }`}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>

        <motion.div
          key={activePath.id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch"
        >
          <div className="relative min-h-[360px] overflow-hidden rounded-[28px] bg-[#E8DED0]">
            <img
              src={activePath.imageUrl}
              alt=""
              className="h-full min-h-[360px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E332D]/82 via-[#1E332D]/18 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="inline-flex items-center rounded-full bg-white/14 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {activePath.label}
              </div>
              <h3 className="mt-4 text-3xl font-semibold leading-tight">
                {activePath.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-white/76">
                {activePath.description}
              </p>
            </div>
          </div>

          <div className="flex min-h-[360px] flex-col justify-between">
            <div>
              <div className="grid grid-cols-3 divide-x divide-[#E4DCCF] border-y border-[#E4DCCF] py-4">
                {[
                  {
                    icon: Clock3,
                    label: "周期",
                    value: activePath.durationLabel,
                  },
                  {
                    icon: BookOpen,
                    label: "节奏",
                    value: activePath.paceLabel,
                  },
                  {
                    icon: Target,
                    label: "目标",
                    value: activePath.outcome,
                  },
                ].map(item => (
                  <div key={item.label} className="px-4 first:pl-0">
                    <item.icon className="h-4 w-4 text-[#6F8F83]" />
                    <p className="mt-2 text-xs font-medium text-[#8A918B]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-[#243B35]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {activePath.focus.map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full bg-[#EEF4EA] px-3 py-1.5 text-xs font-semibold text-[#41675A]"
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-7 border-t border-[#E4DCCF]">
                {pathCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-4 border-b border-[#E4DCCF] py-4 text-left"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3EDE4] text-xs font-semibold text-[#6F8F83]">
                      {index + 1}
                    </span>
                    <button
                      onClick={() => onCourseSelect(course)}
                      className="min-w-0 text-left"
                    >
                      <span className="line-clamp-1 block text-sm font-semibold text-[#243B35] group-hover:text-[#5F7F73]">
                        {course.title}
                      </span>
                      <span className="mt-1 block text-xs text-[#8A918B]">
                        {course.category} / {course.teacher}
                      </span>
                    </button>
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => onCourseSelect(course)}
                        className="text-sm font-semibold text-[#A65F48]"
                      >
                        {formatPrice(course)}
                      </button>
                      {getCourseAction && onCourseAction && (
                        <button
                          onClick={() => onCourseAction(course)}
                          title={getCourseAction(course).description}
                          className="inline-flex h-8 max-w-[5.75rem] items-center justify-center rounded-full bg-[#243B35] px-3 text-xs font-semibold text-white transition hover:bg-[#315047]"
                        >
                          <span className="truncate">
                            {getCourseAction(course).label}
                          </span>
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => onExplorePath(activePath)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#243B35] px-5 text-sm font-semibold text-white transition hover:bg-[#315047]"
              >
                查看这条路径的课程
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              {onAssessment && (
                <button
                  onClick={onAssessment}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#D8CDBD] px-5 text-sm font-semibold text-[#5F6B64] transition hover:bg-[#F3EDE4] hover:text-[#243B35]"
                >
                  先做测评确认状态
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
