import {
  AssessmentFlowSchema,
  AssessmentResultSchema,
  type AssessmentAnswer,
  type AssessmentDimension,
  type AssessmentFlow,
  type AssessmentQuestion,
  type AssessmentResult,
  type AssessmentRiskLevel,
  type Recommendation,
} from "./assessment";

const dimensions: AssessmentDimension[] = [
  "emotion",
  "sleep",
  "relationship",
  "parent_child",
  "workplace",
  "self_growth",
  "risk",
];

const dimensionLabels = {
  emotion: "情绪波动",
  sleep: "睡眠压力",
  relationship: "关系困扰",
  parent_child: "亲子压力",
  workplace: "职场耗竭",
  self_growth: "自我成长",
  risk: "风险信号",
} satisfies Record<AssessmentDimension, string>;

const dimensionRecommendationMap = {
  emotion: [
    {
      target: "course",
      targetId: "1",
      title: "情绪管理入门：掌控你的情绪，提升生活品质",
      reason: "回答显示情绪波动较明显，适合先学习情绪识别和稳定练习。",
      priority: 88,
    },
    {
      target: "course",
      targetId: "16",
      title: "情绪急救手册：应对生活中的突发心理危机",
      reason: "适合作为短期情绪稳定工具，帮助你把当下压力拆成可处理步骤。",
      priority: 82,
    },
  ],
  sleep: [
    {
      target: "course",
      targetId: "10",
      title: "每日十分钟正念冥想：缓解焦虑与失眠",
      reason: "睡眠困扰较突出，建议先建立低压力的睡前放松练习。",
      priority: 86,
    },
  ],
  relationship: [
    {
      target: "course",
      targetId: "6",
      title: "亲密关系心理学：建立健康的婚姻与伴侣关系",
      reason: "关系困扰分值较高，适合先看见互动循环和需求表达方式。",
      priority: 86,
    },
    {
      target: "course",
      targetId: "20",
      title: "婚姻中的情感修复：从冲突到和解的心理路径",
      reason: "如果近期冲突反复发生，这门课更聚焦冲突后的修复。",
      priority: 80,
    },
  ],
  parent_child: [
    {
      target: "course",
      targetId: "7",
      title: "青少年心理健康指南：家长必修课",
      reason: "亲子压力较明显，建议先理解孩子行为背后的心理需求。",
      priority: 86,
    },
    {
      target: "course",
      targetId: "4",
      title: "儿童积极心理学：培养拥有幸福感和复原力的孩子",
      reason: "适合把教育焦虑转化为更稳定的家庭沟通练习。",
      priority: 80,
    },
  ],
  workplace: [
    {
      target: "course",
      targetId: "5",
      title: "职场压力管理与高效能人士的心理韧性训练",
      reason: "职场压力较高，建议从边界感、恢复节奏和沟通策略开始。",
      priority: 86,
    },
    {
      target: "course",
      targetId: "17",
      title: "职场沟通心理学：高情商表达的秘密",
      reason: "如果内耗来自沟通场景，这门课更适合做表达练习。",
      priority: 78,
    },
  ],
  self_growth: [
    {
      target: "course",
      targetId: "11",
      title: "个人成长心理学：发现你的内在力量",
      reason: "自我方向和价值感困惑较明显，适合建立更稳定的自我理解。",
      priority: 84,
    },
    {
      target: "course",
      targetId: "21",
      title: "高敏感人群的自我关怀与能量管理",
      reason: "如果你对外界反应敏感，这门课可帮助梳理能量边界。",
      priority: 78,
    },
  ],
  risk: [],
} satisfies Record<AssessmentDimension, Recommendation[]>;

function createEmptyDimensionScores(): Record<AssessmentDimension, number> {
  return {
    emotion: 0,
    sleep: 0,
    relationship: 0,
    parent_child: 0,
    workplace: 0,
    self_growth: 0,
    risk: 0,
  };
}

function answerValueToScore(
  question: AssessmentQuestion,
  answer: AssessmentAnswer
) {
  if (question.type === "scale" && question.scale) {
    const numericValue =
      typeof answer.value === "number" ? answer.value : Number(answer.value);
    if (!Number.isFinite(numericValue)) return 0;

    const min = question.scale.min;
    const max = question.scale.max;
    if (max <= min) return 0;

    const bounded = Math.min(max, Math.max(min, numericValue));
    return Math.round(((bounded - min) / (max - min)) * 100);
  }

  if (Array.isArray(answer.value)) {
    const optionCount = Math.max(question.options.length, 1);
    return Math.min(100, Math.round((answer.value.length / optionCount) * 100));
  }

  return answer.value ? 60 : 0;
}

function aggregateDimensionScores(
  flow: AssessmentFlow,
  answers: AssessmentAnswer[]
) {
  const totals = createEmptyDimensionScores();
  const counts = createEmptyDimensionScores();
  const answersByQuestionId = new Map(
    answers.map(answer => [answer.questionId, answer])
  );

  for (const question of flow.questions) {
    const answer = answersByQuestionId.get(question.id);
    if (!answer) {
      if (question.required) throw new Error("缺少必要测评回答");
      continue;
    }

    totals[question.dimension] += answerValueToScore(question, answer);
    counts[question.dimension] += 1;
  }

  return dimensions.reduce(
    (scores, dimension) => ({
      ...scores,
      [dimension]: counts[dimension]
        ? Math.round(totals[dimension] / counts[dimension])
        : 0,
    }),
    createEmptyDimensionScores()
  );
}

function resolveRiskLevel(
  scores: Record<AssessmentDimension, number>
): AssessmentRiskLevel {
  const maxConcernScore = Math.max(
    scores.emotion,
    scores.sleep,
    scores.relationship,
    scores.parent_child,
    scores.workplace,
    scores.self_growth
  );

  if (scores.risk >= 75) return "urgent";
  if (scores.risk >= 50 || maxConcernScore >= 82) return "high";
  if (maxConcernScore >= 56) return "medium";
  return "low";
}

function topConcernDimensions(scores: Record<AssessmentDimension, number>) {
  return dimensions
    .filter(dimension => dimension !== "risk")
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, 3);
}

function buildSummary(
  scores: Record<AssessmentDimension, number>,
  riskLevel: AssessmentRiskLevel
) {
  if (riskLevel === "urgent") {
    return "本次回答出现明显风险信号，请优先获得现实中的支持，再考虑课程或自助练习。";
  }

  const topDimensions = topConcernDimensions(scores)
    .filter(dimension => scores[dimension] > 0)
    .map(dimension => dimensionLabels[dimension]);

  if (riskLevel === "high") {
    return `当前困扰强度较高，主要集中在${topDimensions.join("、")}。建议优先预约咨询，并用课程作为辅助练习。`;
  }

  if (riskLevel === "medium") {
    return `当前需要被照顾的部分主要是${topDimensions.join("、")}。可以先从课程练习开始，并持续观察变化。`;
  }

  return "当前风险信号较低，可以从轻量课程、正念练习和日常记录开始建立稳定节奏。";
}

function buildRecommendations(
  scores: Record<AssessmentDimension, number>,
  riskLevel: AssessmentRiskLevel
): Recommendation[] {
  if (riskLevel === "urgent") {
    return [
      {
        target: "emergency_resource",
        title: "优先联系现实支持",
        reason:
          "你的回答提示存在较明显风险，请尽快联系身边可信任的人或当地紧急服务。",
        priority: 100,
      },
      {
        target: "counseling",
        title: "预约专业咨询",
        reason: "风险信号较高时，不建议只依赖自助内容，专业支持应优先进入。",
        priority: 96,
      },
    ];
  }

  const topDimensions = topConcernDimensions(scores).filter(
    dimension => scores[dimension] >= 25
  );
  const courseRecommendations = topDimensions.flatMap(
    dimension => dimensionRecommendationMap[dimension]
  );

  const supportRecommendation: Recommendation =
    riskLevel === "high"
      ? {
          target: "counseling",
          title: "预约一次咨询匹配",
          reason: "当前困扰强度较高，适合让咨询师帮助你一起拆解优先级。",
          priority: 94,
        }
      : {
          target: "assessment",
          targetId: "quick_state_check",
          title: "一周后复测状态",
          reason: "轻中度困扰适合先做练习，再通过复测观察变化趋势。",
          priority: 70,
        };

  return [supportRecommendation, ...courseRecommendations]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}

export function generateAssessmentResult({
  flow,
  answers,
  now = new Date().toISOString(),
  userId,
}: {
  flow: AssessmentFlow;
  answers: AssessmentAnswer[];
  now?: string;
  userId?: string;
}): AssessmentResult {
  const parsedFlow = AssessmentFlowSchema.parse(flow);
  const scores = aggregateDimensionScores(parsedFlow, answers);
  const riskLevel = resolveRiskLevel(scores);
  const report = {
    id: `report_${parsedFlow.id}_${Date.parse(now)}`,
    userId,
    dimensions: scores,
    riskLevel,
    summary: buildSummary(scores, riskLevel),
    recommendations: buildRecommendations(scores, riskLevel),
    createdAt: now,
  };

  const riskEvent =
    riskLevel === "high" || riskLevel === "urgent"
      ? {
          id: `risk_${parsedFlow.id}_${Date.parse(now)}`,
          userId,
          source: "assessment" as const,
          riskLevel: riskLevel === "urgent" ? "urgent" : "high",
          signal: report.summary,
          status: "open" as const,
          createdAt: now,
        }
      : undefined;

  return AssessmentResultSchema.parse({
    report,
    riskEvent,
  });
}
