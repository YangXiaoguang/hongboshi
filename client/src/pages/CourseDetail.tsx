import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Crown,
  HeartHandshake,
  Heart,
  Lock,
  PlayCircle,
  Route,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";
import NotFound from "@/pages/NotFound";
import {
  useCourseAccess,
  useCourseDetail,
  useCourseEngagement,
  getCourseAccessDescription,
  getCourseDetailPrimaryActionCopy,
  getLearningPathForCourse,
  getNextCoursesInLearningPath,
  type Course,
  type CourseAccessStatus,
} from "@/features/courses";

function formatLearners(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatPrice(course: Course): string {
  return course.isFree ? "免费" : `¥${course.price.toFixed(1)}`;
}

const accessCopy = {
  free: "免费学习",
  owned: "已解锁",
  member_included: "会员权益",
  requires_purchase: "需购买",
  requires_membership: "会员可学",
} satisfies Record<CourseAccessStatus, string>;

const actionIcon = {
  play: PlayCircle,
  crown: Crown,
  shoppingBag: ShoppingBag,
};

export default function CourseDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/courses/:courseId");
  const {
    activateMembership,
    getCourseAccess,
    hasActiveMembership,
    isSyncing,
    purchaseCourse,
  } = useCourseAccess();
  const {
    completeChapter,
    getProgress,
    getProgressPercent,
    isFavorited,
    startCourse,
    toggleFavorite,
  } = useCourseEngagement();
  const courseId = Number(params?.courseId);
  const { course, allCourses, relatedCourses, isLoading } = useCourseDetail(
    Number.isInteger(courseId) ? courseId : undefined
  );

  if (!course && isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F5EE] text-[#243B35]">
        <AppHeader />
        <main className="flex min-h-[520px] items-center justify-center px-5">
          <div className="rounded-[28px] border border-[#E4DCCF] bg-[#FFFDF8] px-8 py-7 text-center shadow-sm">
            <p className="text-sm font-semibold text-[#6F8F83]">
              正在同步课程内容
            </p>
            <p className="mt-3 text-xs text-[#7B817C]">
              请稍候，马上进入课程详情。
            </p>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!course) return <NotFound />;

  const totalDuration = course.chapters.reduce(
    (sum, chapter) => sum + chapter.durationMinutes,
    0
  );
  const totalLessons = course.chapters.reduce(
    (sum, chapter) => sum + chapter.lessonCount,
    0
  );
  const progress = getProgress(course.id);
  const progressPercent = getProgressPercent(course.id, course.chapters.length);
  const completedChapterIds = new Set(progress?.completedChapterIds ?? []);
  const hasStarted = Boolean(progress);
  const favorite = isFavorited(course.id);
  const access = getCourseAccess(course);
  const learningPath = getLearningPathForCourse(course);
  const nextPathCourses = getNextCoursesInLearningPath(allCourses, course, 3);
  const supplementalCourses = relatedCourses
    .filter(
      relatedCourse =>
        !nextPathCourses.some(pathCourse => pathCourse.id === relatedCourse.id)
    )
    .slice(0, 3);
  const primaryAction = getCourseDetailPrimaryActionCopy(access, hasStarted);
  const PrimaryActionIcon = actionIcon[primaryAction.icon];
  const pathPosition = learningPath.courseIds.indexOf(course.id);
  const pathStepLabel =
    pathPosition >= 0
      ? `第 ${pathPosition + 1} / ${learningPath.courseIds.length} 门`
      : "路径补充课程";
  const locked = !access.canStart;
  const visibleProgressPercent = access.canStart ? progressPercent : 0;
  const visibleLearningStatus = locked
    ? "待解锁"
    : hasStarted
      ? progress?.status === "completed"
        ? "已完成"
        : "学习中"
      : "未开始";

  const handleStartLearning = () => {
    if (!access.canStart) {
      toast("请先解锁课程", {
        description: getCourseAccessDescription(access.status),
      });
      return;
    }

    startCourse(course.id);
    toast(hasStarted ? "继续学习" : "已加入学习计划", {
      description: hasStarted
        ? "即将进入学习页，继续当前章节。"
        : "课程已放入成长空间，即将进入第一章。",
    });
    navigate(`/courses/${course.id}/learn`);
  };

  const handleToggleFavorite = () => {
    toggleFavorite(course.id);
    toast(favorite ? "已取消收藏" : "已收藏课程", {
      description: favorite
        ? `「${course.title}」已从收藏夹移除。`
        : `「${course.title}」已加入你的成长清单。`,
    });
  };

  const handlePurchaseCourse = () => {
    void purchaseCourse(course).then(syncMode => {
      if (syncMode === "auth_required") {
        toast("请先登录", {
          description: "登录后即可购买课程，并同步学习权益。",
        });
        return;
      }

      toast("课程已解锁", {
        description:
          syncMode === "api"
            ? "课程权益已同步，后续可替换为真实支付回调。"
            : "课程权益已先保存在本机，网络恢复后可再同步。",
      });
    });
  };

  const handleActivateMembership = () => {
    void activateMembership().then(syncMode => {
      if (syncMode === "auth_required") {
        toast("请先登录", {
          description: "登录后即可开通会员，并同步 VIP 课程权益。",
        });
        return;
      }

      toast("会员已开通", {
        description:
          syncMode === "api"
            ? "会员权益已同步，VIP 课程会自动解锁。"
            : "会员权益已先保存在本机，网络恢复后可再同步。",
      });
    });
  };

  const handlePrimaryAction = () => {
    if (access.canStart) {
      handleStartLearning();
      return;
    }

    if (access.status === "requires_membership") {
      handleActivateMembership();
      return;
    }

    handlePurchaseCourse();
  };

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
                onClick={() => navigate("/courses")}
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
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/82">
                  {learningPath.label}
                </span>
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

              <button
                onClick={() =>
                  document
                    .getElementById("learning-path")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="mt-6 inline-flex items-center rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-[#DDE8D9] transition hover:bg-white/18"
              >
                <Route className="mr-2 h-4 w-4" />
                所属路径：{learningPath.title}
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>

              <div className="mt-9 grid max-w-[760px] grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric
                  icon={Users}
                  value={formatLearners(course.learners)}
                  label="学习人数"
                />
                <Metric
                  icon={BookOpen}
                  value={`${totalLessons} 节`}
                  label="课程内容"
                />
                <Metric
                  icon={Clock3}
                  value={`${totalDuration} 分钟`}
                  label="预计时长"
                />
                <Metric
                  icon={CalendarCheck}
                  value={course.teacher}
                  label="主讲老师"
                />
              </div>
            </div>

            <aside className="self-end rounded-[28px] border border-white/14 bg-[#FFFDF8] p-5 text-[#243B35] shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-[#6F8F83]">课程权益</p>
                <button
                  onClick={handleToggleFavorite}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    favorite
                      ? "bg-[#F4E5DE] text-[#A65F48]"
                      : "bg-[#E6EDDF] text-[#41675A] hover:bg-[#DDE8D9]"
                  }`}
                >
                  <Heart
                    className={`h-3.5 w-3.5 ${favorite ? "fill-current" : ""}`}
                  />
                  {favorite ? "已收藏" : "收藏"}
                </button>
              </div>
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
                  {accessCopy[access.status]}
                </span>
              </div>

              <div className="mt-5 rounded-[20px] bg-[#F4EFE6] p-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#6D746F]">学习状态</span>
                  <span
                    className={
                      locked
                        ? "text-[#A65F48]"
                        : hasStarted
                          ? "text-[#41675A]"
                          : "text-[#9AA19B]"
                    }
                  >
                    {visibleLearningStatus}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#6F8F83] transition-all"
                    style={{ width: `${visibleProgressPercent}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-[#7B817C]">
                  {locked
                    ? getCourseAccessDescription(access.status)
                    : hasStarted
                      ? progressPercent > 0
                        ? `已完成 ${progressPercent}% 的章节。`
                        : "已加入学习计划，建议从第一章开始。"
                      : "点击开始学习后，会在本机记录你的进度。"}
                </p>
              </div>

              <p className="mt-4 rounded-[18px] bg-[#FFFDF8] px-4 py-3 text-xs leading-5 text-[#6D746F] ring-1 ring-[#E4DCCF]">
                {primaryAction.description}
              </p>

              <div className="mt-5 space-y-3 text-sm text-[#5F6B64]">
                <p className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#6F8F83]" />
                  隐私友好，学习记录仅自己可见
                </p>
                <p className="flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-[#6F8F83]" />
                  可衔接测评与咨询支持
                </p>
                {course.isVip && (
                  <p className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-[#C4A46A]" />
                    {hasActiveMembership
                      ? "会员权益已生效"
                      : "开通会员可解锁更多课程"}
                  </p>
                )}
              </div>

              <button
                onClick={handlePrimaryAction}
                disabled={isSyncing}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#243B35] text-sm font-semibold text-white transition hover:bg-[#315047] disabled:cursor-wait disabled:opacity-65"
              >
                <PrimaryActionIcon className="mr-2 h-4 w-4" />
                {isSyncing ? "同步中" : primaryAction.label}
              </button>
              {access.status === "requires_membership" &&
                access.canPurchase && (
                  <button
                    onClick={handlePurchaseCourse}
                    disabled={isSyncing}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#EFE7D8] text-sm font-semibold text-[#7A5B31] transition hover:bg-[#E8D8BD] disabled:cursor-wait disabled:opacity-65"
                  >
                    {isSyncing
                      ? "同步中"
                      : `单独购买本课 ¥${course.price.toFixed(1)}`}
                  </button>
                )}
              <button
                onClick={() => navigate("/consulting")}
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
              {course.suitableFor.map(item => (
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

        <section
          id="learning-path"
          className="bg-[#FFFDF8] px-5 py-16 sm:px-8 lg:px-12"
        >
          <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="overflow-hidden rounded-[28px] border border-[#E4DCCF] bg-[#F9F5EE]">
              <img
                src={learningPath.imageUrl}
                alt=""
                className="h-72 w-full object-cover"
              />
              <div className="p-6">
                <p className="text-sm font-semibold text-[#6F8F83]">
                  所属学习路径
                </p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35]">
                  {learningPath.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[#6D746F]">
                  {learningPath.description}
                </p>

                <div className="mt-6 divide-y divide-[#E4DCCF] border-y border-[#E4DCCF]">
                  <PathFact label="路径位置" value={pathStepLabel} />
                  <PathFact label="建议节奏" value={learningPath.paceLabel} />
                  <PathFact
                    label="预计周期"
                    value={learningPath.durationLabel}
                  />
                </div>
              </div>
            </div>

            <div className="self-center">
              <p className="text-sm font-semibold text-[#6F8F83]">转化路径</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#243B35]">
                让课程不只是购买，而是进入一条可持续的成长线
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#6D746F]">
                详情页优先回答“我为什么现在学这门课、学完以后接什么”，让用户从单课决策自然过渡到学习计划。
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {learningPath.focus.map(item => (
                  <span
                    key={item}
                    className="rounded-full bg-[#E6EDDF] px-3 py-1.5 text-xs font-semibold text-[#41675A]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-8 border-l border-[#C9D8C2] pl-5">
                <p className="text-sm font-semibold text-[#243B35]">
                  学完这一课，核心目标是
                </p>
                <p className="mt-3 text-sm leading-7 text-[#6D746F]">
                  {learningPath.outcome}
                </p>
              </div>

              {nextPathCourses.length > 0 && (
                <div className="mt-8 rounded-[24px] border border-[#E4DCCF] bg-[#F9F5EE] p-5">
                  <p className="text-xs font-semibold text-[#6F8F83]">
                    下一门建议课程
                  </p>
                  <button
                    onClick={() =>
                      navigate(`/courses/${nextPathCourses[0].id}`)
                    }
                    className="group mt-4 flex w-full items-center gap-4 text-left"
                  >
                    <img
                      src={nextPathCourses[0].coverUrl}
                      alt=""
                      className="h-20 w-24 shrink-0 rounded-[18px] object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold leading-snug text-[#243B35] group-hover:text-[#5F7F73]">
                        {nextPathCourses[0].title}
                      </span>
                      <span className="mt-2 block text-xs text-[#7B817C]">
                        {nextPathCourses[0].category} ·{" "}
                        {nextPathCourses[0].teacher}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#6F8F83]" />
                  </button>
                </div>
              )}
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
                  <div
                    key={chapter.id}
                    className="grid gap-4 py-6 sm:grid-cols-[72px_1fr_auto]"
                  >
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
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#7B817C] sm:justify-end">
                      <span>{chapter.lessonCount} 节</span>
                      <span>{chapter.durationMinutes} 分钟</span>
                      <button
                        onClick={() => {
                          if (!access.canStart) {
                            toast("课程尚未解锁", {
                              description: getCourseAccessDescription(
                                access.status
                              ),
                            });
                            return;
                          }

                          completeChapter(
                            course.id,
                            chapter.id,
                            course.chapters.length
                          );
                          toast(
                            completedChapterIds.has(chapter.id)
                              ? "章节已完成"
                              : "已记录章节进度",
                            {
                              description: `「${chapter.title}」已同步到本机学习记录。`,
                            }
                          );
                        }}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
                          !access.canStart
                            ? "bg-[#F4E5DE] text-[#A65F48]"
                            : completedChapterIds.has(chapter.id)
                              ? "bg-[#DDE8D9] text-[#41675A]"
                              : "bg-white text-[#6D746F] hover:text-[#243B35]"
                        }`}
                      >
                        {!access.canStart ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        {!access.canStart
                          ? "待解锁"
                          : completedChapterIds.has(chapter.id)
                            ? "已完成"
                            : "标记完成"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="self-start rounded-[28px] bg-[#243B35] p-7 text-white">
              <p className="text-sm font-semibold text-[#BFD0B8]">
                学完你会获得
              </p>
              <div className="mt-6 space-y-4">
                {course.outcomes.map(item => (
                  <p
                    key={item}
                    className="flex gap-3 text-sm leading-7 text-white/78"
                  >
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

        {(nextPathCourses.length > 0 || supplementalCourses.length > 0) && (
          <section className="px-5 py-16 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-[1200px]">
              <div className="mb-7 flex items-end justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold text-[#6F8F83]">
                    继续探索
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-[#243B35]">
                    下一门课与补充内容分开看
                  </h2>
                </div>
                <button
                  onClick={() => navigate("/courses")}
                  className="hidden items-center text-sm font-semibold text-[#41675A] transition hover:text-[#243B35] sm:inline-flex"
                >
                  回到课程中心
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>

              <div className="space-y-12">
                {nextPathCourses.length > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[#8C6E4A]">
                          继续这条路径
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                          按学习路径接着走，减少下一步选择成本。
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {nextPathCourses.map(item => (
                        <CompactCourseCard
                          key={item.id}
                          course={item}
                          eyebrow={`${learningPath.label}路径`}
                          onClick={() => navigate(`/courses/${item.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {supplementalCourses.length > 0 && (
                  <div>
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-[#8C6E4A]">
                        同主题补充
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#6D746F]">
                        这些课程保留在关联推荐层，用来扩展主题理解。
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {supplementalCourses.map(item => (
                        <CompactCourseCard
                          key={item.id}
                          course={item}
                          eyebrow={item.category}
                          onClick={() => navigate(`/courses/${item.id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
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

function PathFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-xs font-semibold text-[#7B817C]">{label}</span>
      <span className="text-sm font-semibold text-[#243B35]">{value}</span>
    </div>
  );
}

function CompactCourseCard({
  course,
  eyebrow,
  onClick,
}: {
  course: Course;
  eyebrow: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-[24px] border border-[#E4DCCF] bg-[#FFFDF8] p-4 text-left transition hover:-translate-y-1 hover:border-[#AFC2AB]"
    >
      <img
        src={course.coverUrl}
        alt=""
        className="h-36 w-full rounded-[18px] object-cover"
      />
      <p className="mt-4 text-xs font-semibold text-[#6F8F83]">{eyebrow}</p>
      <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-[#243B35] group-hover:text-[#5F7F73]">
        {course.title}
      </h3>
      <p className="mt-3 text-sm text-[#7B817C]">{course.teacher}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#EAE2D6] pt-3 text-xs font-semibold">
        <span className="text-[#A65F48]">{formatPrice(course)}</span>
        <span className="text-[#7B817C]">
          {formatLearners(course.learners)} 人学习
        </span>
      </div>
    </button>
  );
}
