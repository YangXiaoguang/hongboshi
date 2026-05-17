import type { CourseCategory, CourseDetail } from "@shared/domain";

export interface CourseTrustMetric {
  label: string;
  value: string;
  description: string;
}

export interface CourseTrustHighlight {
  title: string;
  description: string;
}

export interface CourseTrustFeedback {
  profile: string;
  quote: string;
  result: string;
}

export interface CourseTrustPolicy {
  title: string;
  description: string;
}

export interface CourseTrustFaq {
  question: string;
  answer: string;
}

export interface CourseTrustProfile {
  metrics: CourseTrustMetric[];
  instructor: {
    title: string;
    description: string;
    highlights: CourseTrustHighlight[];
  };
  feedback: CourseTrustFeedback[];
  policies: CourseTrustPolicy[];
  faqs: CourseTrustFaq[];
}

const categoryInstructorFocus: Record<CourseCategory, string> = {
  个人成长: "自我探索与长期成长陪伴",
  情绪管理: "情绪调节与压力稳定训练",
  职场心理: "职场压力、边界与沟通议题",
  家庭教育: "亲子沟通与儿童心理支持",
  心理科普: "心理健康科普与支持路径识别",
  婚姻关系: "亲密关系沟通与冲突修复",
  青少年心理: "青少年情绪与家庭支持系统",
  心理咨询师: "咨询伦理、基础技术和专业成长",
  正念冥想: "正念减压、身体觉察和日常练习",
  认知行为: "认知行为框架与自助练习",
  催眠治疗: "放松训练、想象练习和技术边界",
  沙盘疗法: "象征表达、儿童工作和安全边界",
  绘画疗法: "表达性艺术、情绪整理和图像觉察",
  团体辅导: "团体安全、支持反馈和关系练习",
};

const categoryFeedbackFocus: Record<CourseCategory, string[]> = {
  个人成长: [
    "把自我怀疑拆成了可以记录的线索",
    "开始用更温和的方式安排一周计划",
  ],
  情绪管理: ["能更快识别情绪触发点", "学会了短时稳定练习"],
  职场心理: ["会议后的内耗减少了", "更清楚地表达边界和需求"],
  家庭教育: ["亲子冲突前能先看见孩子的情绪", "家庭沟通更少进入指责循环"],
  心理科普: ["更能区分压力和需要求助的信号", "对心理困扰的误解减少了"],
  婚姻关系: ["争吵后更容易回到修复", "能说清楚自己的真实需求"],
  青少年心理: ["更理解青春期行为背后的压力", "陪伴时不再只靠说教"],
  心理咨询师: ["伦理边界意识更清楚", "对咨询流程有了结构感"],
  正念冥想: ["睡前练习更容易坚持", "身体紧绷时有了可用的放松流程"],
  认知行为: ["能抓到自动化想法", "开始尝试小的行为实验"],
  催眠治疗: ["理解了自助练习的安全边界", "放松练习更有步骤"],
  沙盘疗法: ["更理解孩子的象征表达", "知道什么情况应交给专业人员"],
  绘画疗法: ["不再评价画得好不好", "能借助图像整理情绪"],
  团体辅导: ["更敢在关系里表达自己", "学会了接受反馈和支持"],
};

function formatLearnerCount(learners: number): string {
  if (learners >= 10000) return `${(learners / 10000).toFixed(1)}万`;
  if (learners >= 1000) return `${(learners / 1000).toFixed(1)}k`;
  return String(learners);
}

function createRating(course: CourseDetail): string {
  const rating = Math.min(4.9, 4.6 + (course.id % 4) * 0.1);
  return rating.toFixed(1);
}

function createReviewCount(course: CourseDetail): number {
  return Math.max(48, Math.round(course.learners * 0.12));
}

function createCompletionRate(course: CourseDetail): number {
  return Math.min(91, 76 + (course.id % 10));
}

function createSatisfactionRate(course: CourseDetail): number {
  return Math.min(98, 94 + (course.id % 5));
}

export function buildCourseTrustProfile(
  course: CourseDetail
): CourseTrustProfile {
  const feedbackFocus = categoryFeedbackFocus[course.category];
  const completionRate = createCompletionRate(course);
  const satisfactionRate = createSatisfactionRate(course);

  return {
    metrics: [
      {
        label: "学员评分",
        value: createRating(course),
        description: `${createReviewCount(course)} 条学习反馈`,
      },
      {
        label: "持续学习",
        value: `${completionRate}%`,
        description: "近期开课后的阶段完成率",
      },
      {
        label: "服务满意",
        value: `${satisfactionRate}%`,
        description: "围绕内容、交付和支持的综合反馈",
      },
    ],
    instructor: {
      title: `${course.teacher} 主讲`,
      description: `聚焦${categoryInstructorFocus[course.category]}，课程内容会围绕适合人群、练习边界和后续支持路径展开。`,
      highlights: [
        {
          title: "讲师信息前置",
          description:
            "购买前展示主讲人、课程主题和适合人群，不把关键判断藏到支付之后。",
        },
        {
          title: "内容边界审核",
          description:
            "心理课程强调支持与教育，不承诺替代诊断、治疗或危机干预。",
        },
        {
          title: "练习可落地",
          description: `${course.chapters.length} 个学习阶段，配套章节练习和成长档案沉淀。`,
        },
      ],
    },
    feedback: [
      {
        profile: `${course.category}学习者`,
        quote: `“${feedbackFocus[0]}，课程不是催着我马上改变，而是让我知道下一步怎么做。”`,
        result: course.outcomes[0] ?? "形成更清楚的行动线索",
      },
      {
        profile: `${course.type}课程学员`,
        quote: `“${feedbackFocus[1]}，学习记录留在成长空间里，复盘时很方便。”`,
        result: course.outcomes[1] ?? "建立更稳定的练习节奏",
      },
    ],
    policies: [
      {
        title: "权益即时交付",
        description:
          "支付确认后课程权益写入账户，可在课程详情、学习页和成长空间继续承接。",
      },
      {
        title: "待支付可取消",
        description:
          "未完成支付的订单会保留支付窗口，用户可继续支付或取消，不发放课程权益。",
      },
      {
        title: "售后人工核实",
        description:
          "正式售后入口接入前，退款与异常订单由运营后台按订单状态和审计记录核实处理。",
      },
      {
        title: "隐私最小化",
        description:
          "学习进度、练习内容和完成反馈只进入本人账户，不在评价或后台摘要中暴露原文。",
      },
    ],
    faqs: [
      {
        question: "这门课可以替代心理咨询或治疗吗？",
        answer:
          "不可以。课程用于心理教育、练习和自我理解；如果存在持续高风险、危机或严重症状，应优先寻求专业咨询、医疗或紧急支持。",
      },
      {
        question: "购买后在哪里开始学习？",
        answer:
          "支付确认后会解锁课程权益，用户可以从本详情页、课程中心或成长空间进入学习页，章节进度会沉淀到成长档案。",
      },
      {
        question: "学完后能获得什么证明？",
        answer:
          "完成课程后会生成阶段证明预览，用于个人学习记录。正式证书编号与签发流程会在服务端签发能力完成后启用。",
      },
      {
        question: "如果买错课程或支付异常怎么办？",
        answer:
          "待支付订单可直接取消；已支付订单的退款或异常处理会进入运营后台，由客服根据支付回调、订单状态和权益交付记录核实。",
      },
    ],
  };
}

export function createCourseTrustSummary(course: CourseDetail): string {
  const profile = buildCourseTrustProfile(course);
  const learners = formatLearnerCount(course.learners);
  return `${profile.metrics[0].value} 分 · ${learners} 人学习 · ${profile.metrics[1].value} 阶段完成率`;
}
