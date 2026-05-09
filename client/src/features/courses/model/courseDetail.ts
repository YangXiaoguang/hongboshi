import type { Course, CourseCategory, CourseDetail } from "@shared/domain";

const categoryCopy: Record<
  CourseCategory,
  {
    subtitle: string;
    summary: string;
    supportPath: string;
    suitableFor: string[];
    outcomes: string[];
  }
> = {
  个人成长: {
    subtitle: "在自我理解中建立更稳定的内在支点",
    summary: "把抽象的成长愿望拆成可练习的小步骤，适合想重新认识自己、调整生活节奏的人。",
    supportPath: "建议搭配一次轻量测评，明确当前成长主题后再制定 4 周学习计划。",
    suitableFor: ["经常自我怀疑", "想提升自我接纳", "希望建立长期成长节奏"],
    outcomes: ["识别常见内在评价模式", "建立更温和的自我对话", "形成可坚持的行动清单"],
  },
  情绪管理: {
    subtitle: "先稳住情绪，再重新获得行动感",
    summary: "围绕情绪识别、压力调节和日常练习，帮助用户在低落、焦虑或易怒时有更清楚的应对方法。",
    supportPath: "如果近期情绪波动明显，可先完成状态评估，再决定是否预约咨询。",
    suitableFor: ["最近情绪起伏大", "容易被压力击穿", "想学习可操作的稳定方法"],
    outcomes: ["识别情绪触发点", "掌握短时稳定练习", "形成个人情绪照护方案"],
  },
  职场心理: {
    subtitle: "恢复边界感、能量感与沟通主动权",
    summary: "面向职场压力、耗竭、沟通冲突和职业倦怠，帮助学习者把工作问题拆回可处理的心理任务。",
    supportPath: "建议结合压力测评和一次咨询匹配，区分是技能问题、边界问题还是长期耗竭。",
    suitableFor: ["工作中长期紧绷", "沟通后容易内耗", "想建立更清晰的边界"],
    outcomes: ["区分压力来源", "练习高情商表达", "建立职场恢复计划"],
  },
  家庭教育: {
    subtitle: "在教育焦虑里重新找到连接",
    summary: "帮助家长理解孩子行为背后的心理需求，减少说教和对抗，建立更稳定的亲子沟通方式。",
    supportPath: "建议先记录一周亲子冲突场景，再结合课程或咨询制定家庭沟通练习。",
    suitableFor: ["亲子沟通常常卡住", "面对孩子情绪不知所措", "希望降低教育焦虑"],
    outcomes: ["理解孩子情绪信号", "减少冲突升级", "设计家庭沟通约定"],
  },
  心理科普: {
    subtitle: "用科学视角理解心理困扰",
    summary: "把常见心理概念讲清楚，帮助用户区分正常压力、持续困扰和需要专业支持的信号。",
    supportPath: "适合作为入门内容，也可作为测评前后的解释材料。",
    suitableFor: ["想先了解心理知识", "担心自己是否需要咨询", "希望减少对心理问题的误解"],
    outcomes: ["理解基础心理概念", "识别常见误区", "知道何时寻求专业支持"],
  },
  婚姻关系: {
    subtitle: "把关系里的反复拉扯说清楚",
    summary: "聚焦亲密关系中的沟通、防御、期待和边界，帮助学习者从责备循环里退一步看见关系模式。",
    supportPath: "如果关系冲突持续升级，建议课程学习后预约伴侣或个人咨询。",
    suitableFor: ["关系中反复争吵", "难以表达真实需求", "想理解伴侣互动模式"],
    outcomes: ["看见关系循环", "练习非攻击性表达", "建立冲突后的修复方式"],
  },
  青少年心理: {
    subtitle: "理解青春期变化背后的心理需求",
    summary: "帮助家长和教育者理解青少年的情绪、边界、自我认同和网络行为，减少简单归因。",
    supportPath: "涉及自伤、极端退缩或严重成瘾信号时，应优先进入专业咨询与风险评估。",
    suitableFor: ["关注青少年情绪变化", "面对孩子退缩或冲突", "希望更科学地陪伴青春期"],
    outcomes: ["识别青少年压力信号", "改善家庭沟通方式", "建立支持与边界并存的陪伴策略"],
  },
  心理咨询师: {
    subtitle: "面向助人者的专业成长路径",
    summary: "围绕咨询伦理、基础技术、案例理解和职业规范，帮助学习者建立专业、审慎的助人框架。",
    supportPath: "建议与督导、同辈练习和伦理学习结合，不把课程替代专业训练。",
    suitableFor: ["心理学学习者", "助人行业从业者", "准备系统进入咨询训练的人"],
    outcomes: ["建立伦理底线意识", "理解咨询基础流程", "形成继续训练计划"],
  },
  正念冥想: {
    subtitle: "让身体重新学会放松",
    summary: "通过呼吸、身体扫描和觉察练习，帮助学习者在睡眠、焦虑和压力场景中恢复稳定感。",
    supportPath: "适合与睡眠记录、情绪记录一起使用，形成每日 10 分钟练习。",
    suitableFor: ["睡前停不下来", "身体长期紧绷", "想用温和方式缓解焦虑"],
    outcomes: ["掌握基础呼吸练习", "建立睡前放松流程", "提升对身体信号的觉察"],
  },
  认知行为: {
    subtitle: "识别想法、情绪和行为之间的循环",
    summary: "用认知行为视角拆解困扰，帮助用户看见自动化想法，并练习更有效的行为实验。",
    supportPath: "适合与咨询师共同使用，也可作为自助练习框架。",
    suitableFor: ["容易陷入负面想法", "想学习结构化自助方法", "希望改善拖延或回避"],
    outcomes: ["识别自动化想法", "完成思维记录", "设计可执行的行为实验"],
  },
  催眠治疗: {
    subtitle: "了解放松、想象与潜意识工作的边界",
    summary: "以科普和入门练习为主，帮助学习者理解催眠治疗的适用范围、禁忌和基本方法。",
    supportPath: "涉及创伤、解离或严重症状时，不建议自助尝试，应转向专业支持。",
    suitableFor: ["对催眠治疗感兴趣", "想学习深度放松方法", "需要理解技术边界"],
    outcomes: ["理解催眠基本概念", "完成安全放松练习", "识别不适合自助的情形"],
  },
  沙盘疗法: {
    subtitle: "通过象征表达看见内在经验",
    summary: "介绍沙盘工作的基础理念、观察方式和适用场景，适合心理学习者和家长了解表达性方法。",
    supportPath: "沙盘更适合在受训专业人员陪伴下进行，课程侧重理解而非替代治疗。",
    suitableFor: ["想了解表达性治疗", "关注儿童心理表达", "心理咨询学习者"],
    outcomes: ["理解象征表达", "认识沙盘流程", "知道家庭场景中的安全边界"],
  },
  绘画疗法: {
    subtitle: "用图像表达语言难以说出的部分",
    summary: "从绘画体验进入情绪和自我探索，帮助学习者用非评判方式观察图像中的感受。",
    supportPath: "适合作为情绪表达练习，深层议题建议结合咨询。",
    suitableFor: ["语言表达困难", "想尝试创造性自我探索", "希望陪伴孩子表达情绪"],
    outcomes: ["完成低压力绘画练习", "练习图像觉察", "建立表达后的整理方法"],
  },
  团体辅导: {
    subtitle: "在关系现场里练习支持和表达",
    summary: "介绍团体辅导的基本结构、参与方式和安全规则，帮助用户理解团体成长的价值。",
    supportPath: "建议结合带领者资质和团体规则选择适合自己的小组。",
    suitableFor: ["想在群体中获得支持", "希望练习表达和倾听", "对团体咨询感兴趣"],
    outcomes: ["理解团体安全规则", "练习反馈与倾听", "判断适合自己的团体形式"],
  },
};

export function buildCourseDetail(course: Course): CourseDetail {
  const copy = categoryCopy[course.category];

  return {
    ...course,
    subtitle: copy.subtitle,
    summary: copy.summary,
    suitableFor: copy.suitableFor.map((title, index) => ({
      title,
      description: [
        "希望先用低压力方式开始，不急着把问题一次说清楚。",
        "需要把当前困扰拆成更具体、可练习的步骤。",
        "适合在课程、测评和咨询之间找到更清楚的下一步。",
      ][index],
    })),
    outcomes: copy.outcomes,
    supportPath: copy.supportPath,
    chapters: [
      {
        id: `${course.id}-chapter-1`,
        title: "看见当下困扰",
        description: `从${course.category}的常见场景进入，识别问题背后的情绪、需求和触发点。`,
        durationMinutes: 38,
        lessonCount: 4,
      },
      {
        id: `${course.id}-chapter-2`,
        title: "建立理解框架",
        description: "用心理学概念把模糊感受说清楚，形成更稳定的自我观察视角。",
        durationMinutes: 52,
        lessonCount: 5,
      },
      {
        id: `${course.id}-chapter-3`,
        title: "进入日常练习",
        description: "把课程方法落到一周行动计划中，记录变化并调整支持路径。",
        durationMinutes: 46,
        lessonCount: 4,
      },
    ],
  };
}

export function getRelatedCourses(courses: Course[], currentCourse: Course, limit = 3): Course[] {
  const sameCategory = courses.filter(
    (course) => course.category === currentCourse.category && course.id !== currentCourse.id
  );
  const fallback = courses.filter((course) => course.id !== currentCourse.id);

  return (sameCategory.length ? sameCategory : fallback).slice(0, limit);
}
