import { useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import NotFound from "@/pages/NotFound";
import { mockCourseRepository, type Course } from "@/features/courses";

function formatLearners(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatPrice(course: Course): string {
  return course.isFree ? "免费" : `¥${course.price.toFixed(1)}`;
}

export default function CourseDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/courses/:courseId");
  const courseId = Number(params?.courseId);

  const course = useMemo(() => {
    if (!Number.isInteger(courseId)) return undefined;
    return mockCourseRepository.getCourseDetailById(courseId);
  }, [courseId]);

  const relatedCourses = useMemo(() => {
    if (!Number.isInteger(courseId)) return [];
    return mockCourseRepository.listRelatedCourses(courseId, 3);
  }, [courseId]);

  if (!course) return <NotFound />;

  const totalDuration = course.chapters.reduce(
    (sum, chapter) => sum + chapter.durationMinutes,
    0
  );
  const totalLessons = course.chapters.reduce(
    (sum, chapter) => sum + chapter.lessonCount,
    0
  );

  return (
    <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
      <AppHeader />

      <main>
        <section className="relative overflow-hidden bg-[#243B35] text-white">
          <img
            src={course.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#13211D] via-[#243B35]/88 to-[#243B35]/48" />

          <div className="relative mx-auto grid max-w-[1200px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_360px] lg:px-12 lg:py-20">
            <div>
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                返回课程中心
              </button>

              <div className="mt-10 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#DDE8D9] px-3 py-1 text-xs font-semibold text-[#243B35]">
                  {course.category}
                </span>
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/82">
                  {course.type}
                </span>
                {course.isVip && (
                  <span className="rounded-full bg-[#C4A46A] px-3 py-1 text-xs font-semibold text-[#243B35]">
                    会员内容
                  </span>
                )}
              </div>

              <h1 className="mt-5 max-w-[760px] text-4xl font-semibold leading-tight sm:text-5xl">
                {course.title}
              </h1>
              <p className="mt-5 max-w-[680px] text-xl leading-8 text-[#DDE8D9]">
                {course.subtitle}
              </p>
              <p className="mt-5 max-w-[720px] text-sm leading-7 text-white/68">
                {course.summary}
              </p>

              <div className="mt-9 grid max-w-[760px] grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric icon={Users} value={formatLearners(course.learners)} label="学习人数" />
                <Metric icon={BookOpen} value={`${totalLessons} 节`} label="课程内容" />
                <Metric icon={Clock3} value={`${totalDuration} 分钟`} label="预计时长" />
                <Metric icon={CalendarCheck} value={course.teacher} label="主讲老师" />
              </div>
            </div>

            <aside className="self-end rounded-[28px] border border-white/14 bg-[#FFFDF8] p-5 text-[#243B35] shadow-2xl shadow-black/20">
              <p className="text-xs font-semibold text-[#6F8F83]">课程权益</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold text-[#A65F48]">
                    {formatPrice(course)}
                  </p>
                  {!course.isFree && course.originalPrice > course.price && (
                    <p className="mt-1 text-xs text-[#9AA19B] line-through">
                      ¥{course.originalPrice.toFixed(1)}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-[#E6EDDF] px-3 py-1 text-xs font-semibold text-[#41675A]">
                  可收藏学习
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm text-[#5F6B64]">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#6F8F83]" />
                  隐私友好，学习记录仅自己可见
                </p>
                <p className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-[#6F8F83]" />
                  可衔接测评与咨询支持
                </p>
              </div>

              <button
                onClick={() =>
                  toast("开始学习", {
                    description: "学习进度与订单能力将在下一阶段接入。",
                  })
                }
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#243B35] text-sm font-semibold text-white transition hover:bg-[#315047]"
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                开始学习
              </button>
              <button
                onClick={() =>
                  toast("预约咨询", {
                    description: "可以根据这门课的主题匹配咨询师，预约流程即将接入。",
                  })
                }
                className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full border border-[#DCD3C4] text-sm font-semibold text-[#41675A] transition hover:bg-[#EEF4EA]"
              >
                需要咨询师陪伴
              </button>
            </aside>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <p className="text-sm font-semibold text-[#6F8F83]">是否适合你</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35]">
                先判断匹配度，再开始学习
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#6D746F]">
                心理成长内容不应该只追求“买下”，更重要的是当下状态是否适合、学完之后能不能落地。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {course.suitableFor.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[22px] border border-[#E4DCCF] bg-[#FFFDF8]/80 p-5"
                >
                  <Sparkles className="h-5 w-5 text-[#8C6E4A]" />
                  <h3 className="mt-4 text-lg font-semibold text-[#243B35]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#6D746F]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F3EDE4] px-5 py-16 sm:px-8 lg:px-12">
          <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-semibold text-[#6F8F83]">课程路线</p>
              <h2 className="mt-3 text-3xl font-semibold text-[#243B35]">
                从理解到练习，逐步进入日常
              </h2>

              <div className="mt-8 divide-y divide-[#E1D7C7] border-y border-[#E1D7C7]">
                {course.chapters.map((chapter, index) => (
                  <div key={chapter.id} className="grid gap-4 py-6 sm:grid-cols-[72px_1fr_auto]">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DDE8D9] text-sm font-semibold text-[#243B35]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold text-[#243B35]">
                        {chapter.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#6D746F]">
                        {chapter.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold text-[#7B817C] sm:justify-end">
                      <span>{chapter.lessonCount} 节</span>
                      <span>{chapter.durationMinutes} 分钟</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="self-start rounded-[28px] bg-[#243B35] p-7 text-white">
              <p className="text-sm font-semibold text-[#BFD0B8]">学完你会获得</p>
              <div className="mt-6 space-y-4">
                {course.outcomes.map((item) => (
                  <p key={item} className="flex gap-3 text-sm leading-7 text-white/78">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#BFD0B8]" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="mt-7 border-t border-white/14 pt-6">
                <p className="text-sm font-semibold text-white">推荐支持路径</p>
                <p className="mt-3 text-sm leading-7 text-white/68">
                  {course.supportPath}
                </p>
              </div>
            </div>
          </div>
        </section>

        {relatedCourses.length > 0 && (
          <section className="px-5 py-16 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-[1200px]">
              <div className="mb-7 flex items-end justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">继续探索</p>
                  <h2 className="mt-3 text-3xl font-semibold text-[#243B35]">
                    同主题的其他内容
                  </h2>
                </div>
                <button
                  onClick={() => navigate("/")}
                  className="hidden items-center text-sm font-semibold text-[#41675A] transition hover:text-[#243B35] sm:inline-flex"
                >
                  回到课程中心
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {relatedCourses.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/courses/${item.id}`)}
                    className="group rounded-[24px] border border-[#E4DCCF] bg-[#FFFDF8] p-4 text-left transition hover:-translate-y-1 hover:border-[#AFC2AB]"
                  >
                    <img
                      src={item.coverUrl}
                      alt=""
                      className="h-36 w-full rounded-[18px] object-cover"
                    />
                    <p className="mt-4 text-xs font-semibold text-[#6F8F83]">
                      {item.category}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-[#243B35] group-hover:text-[#5F7F73]">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm text-[#7B817C]">{item.teacher}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string;
  label: string;
}) {
  return (
    <div className="border-l border-white/18 pl-4 first:border-l-0 first:pl-0">
      <Icon className="h-4 w-4 text-[#BFD0B8]" />
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-white/58">{label}</p>
    </div>
  );
}
