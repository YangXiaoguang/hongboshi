import { ArrowRight, Flame, Gift, Sparkles } from "lucide-react";
import {
  createCoursePromotionSummary,
  formatCheckoutMoney,
  type Course,
} from "@/features/courses";

interface CourseStarterLanesProps {
  courses: Course[];
  onCourseSelect: (course: Course) => void;
  getCourseAction?: (course: Course) => {
    label: string;
    description: string;
  };
  onCourseAction?: (course: Course) => void;
}

function formatPrice(course: Course): string {
  if (course.isFree) return "免费";

  const promotion = createCoursePromotionSummary(course);
  const prefix = promotion.courseCouponAmount > 0 ? "券后 " : "";
  return `${prefix}${formatCheckoutMoney(promotion.coursePayableAmount)}`;
}

function pickUnique(courses: Course[], predicate: (course: Course) => boolean) {
  return courses.filter(predicate).slice(0, 3);
}

export default function CourseStarterLanes({
  courses,
  onCourseSelect,
  getCourseAction,
  onCourseAction,
}: CourseStarterLanesProps) {
  const lanes = [
    {
      icon: Flame,
      label: "热门课程",
      title: "先看大家正在学什么",
      courses: [...courses].sort((a, b) => b.learners - a.learners).slice(0, 3),
    },
    {
      icon: Gift,
      label: "免费入门",
      title: "低压力开始第一节课",
      courses: pickUnique(courses, course => course.isFree),
    },
    {
      icon: Sparkles,
      label: "会员可学",
      title: "适合持续学习的内容",
      courses: pickUnique(courses, course => course.isVip),
    },
  ];

  return (
    <section className="bg-[#F9F5EE] px-5 py-14 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 max-w-[680px]">
          <p className="text-sm font-semibold text-[#6F8F83]">快速开始</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35] sm:text-4xl">
            不确定选哪条路径，也可以先从这些课程开始
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {lanes.map(lane => (
            <div key={lane.label} className="border-t border-[#D8CDBD] pt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#6F8F83]">
                <lane.icon className="h-4 w-4" />
                {lane.label}
              </div>
              <h3 className="mt-3 text-xl font-semibold text-[#243B35]">
                {lane.title}
              </h3>

              <div className="mt-5 divide-y divide-[#E4DCCF] border-y border-[#E4DCCF]">
                {lane.courses.map(course => (
                  <div
                    key={course.id}
                    className="group flex w-full items-center justify-between gap-4 py-4 text-left"
                  >
                    <button
                      onClick={() => onCourseSelect(course)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="line-clamp-1 block text-sm font-semibold text-[#243B35] group-hover:text-[#5F7F73]">
                        {course.title}
                      </span>
                      <span className="mt-1 block text-xs text-[#8A918B]">
                        {course.category} / {course.teacher}
                      </span>
                    </button>
                    <span className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => onCourseSelect(course)}
                        className="inline-flex items-center text-sm font-semibold text-[#A65F48]"
                      >
                        {formatPrice(course)}
                        <ArrowRight className="ml-1 h-3.5 w-3.5 text-[#8C6E4A]" />
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
          ))}
        </div>
      </div>
    </section>
  );
}
