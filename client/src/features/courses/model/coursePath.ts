import type { Course, CourseCategory } from "@shared/domain";

export type CourseLearningPathId =
  | "emotion-reset"
  | "relationship-repair"
  | "family-connection"
  | "workplace-resilience"
  | "self-growth";

export interface CourseLearningPath {
  id: CourseLearningPathId;
  label: string;
  title: string;
  description: string;
  primaryCategory: CourseCategory;
  relatedCategories: CourseCategory[];
  durationLabel: string;
  paceLabel: string;
  outcome: string;
  focus: string[];
  courseIds: number[];
  imageUrl: string;
  discoveryTitle: string;
  discoveryDescription: string;
}

export const courseLearningPaths: CourseLearningPath[] = [
  {
    id: "emotion-reset",
    label: "情绪稳定",
    title: "7 天情绪稳定入门",
    description:
      "从识别情绪、身体放松到日常复盘，先把波动降下来，再慢慢恢复掌控感。",
    primaryCategory: "情绪管理",
    relatedCategories: ["正念冥想", "心理科普", "认知行为"],
    durationLabel: "7 天",
    paceLabel: "每天 15 分钟",
    outcome: "建立一套低压力的情绪急救动作",
    focus: ["情绪识别", "正念练习", "认知调整"],
    courseIds: [1, 10, 16, 3, 22],
    imageUrl:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=84",
    discoveryTitle: "情绪稳定课程，先从这组开始",
    discoveryDescription:
      "优先展示情绪管理、正念和认知行为课程，适合想先缓下来、稳住日常节奏的用户。",
  },
  {
    id: "relationship-repair",
    label: "关系修复",
    title: "14 天亲密关系沟通练习",
    description:
      "把争吵、冷战和委屈拆成可练习的表达方式，先学会说清楚，再谈修复。",
    primaryCategory: "婚姻关系",
    relatedCategories: ["个人成长", "心理科普"],
    durationLabel: "14 天",
    paceLabel: "每周 3 次练习",
    outcome: "形成一次更安全的关系对话",
    focus: ["冲突复盘", "边界表达", "情绪需求"],
    courseIds: [6, 20, 11, 21],
    imageUrl:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=84",
    discoveryTitle: "关系修复课程，先从沟通和边界开始",
    discoveryDescription:
      "优先展示亲密关系、个人成长和心理科普课程，帮助用户把关系困扰转成可练习的步骤。",
  },
  {
    id: "family-connection",
    label: "亲子连接",
    title: "21 天亲子沟通恢复计划",
    description:
      "从理解孩子状态到调整回应方式，帮助家长减少对抗，把教育焦虑重新放回连接里。",
    primaryCategory: "家庭教育",
    relatedCategories: ["青少年心理", "沙盘疗法"],
    durationLabel: "21 天",
    paceLabel: "每周 2-3 次",
    outcome: "建立一个更能被孩子接住的沟通节奏",
    focus: ["青少年心理", "家庭动力", "情绪回应"],
    courseIds: [4, 7, 18, 23, 13],
    imageUrl:
      "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1200&q=84",
    discoveryTitle: "亲子沟通课程，先理解孩子再调整方法",
    discoveryDescription:
      "优先展示家庭教育和青少年心理课程，适合希望降低冲突、改善亲子沟通的家庭。",
  },
  {
    id: "workplace-resilience",
    label: "职场韧性",
    title: "10 天职场压力恢复路径",
    description:
      "围绕压力、边界和沟通训练，帮助用户从耗竭里恢复能量，重新安排工作节奏。",
    primaryCategory: "职场心理",
    relatedCategories: ["情绪管理", "个人成长"],
    durationLabel: "10 天",
    paceLabel: "午休或睡前学习",
    outcome: "找到一个可持续的工作边界",
    focus: ["压力管理", "高情商表达", "心理韧性"],
    courseIds: [5, 17, 16, 11],
    imageUrl:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=84",
    discoveryTitle: "职场心理课程，先恢复能量和边界",
    discoveryDescription:
      "优先展示职场心理、情绪管理和个人成长课程，适合压力高、沟通耗能或边界感不足的用户。",
  },
  {
    id: "self-growth",
    label: "自我成长",
    title: "30 天自我理解与关怀路径",
    description:
      "从高敏感、自我怀疑和内在资源出发，慢慢建立更稳定的自我支持系统。",
    primaryCategory: "个人成长",
    relatedCategories: ["正念冥想", "绘画疗法", "认知行为"],
    durationLabel: "30 天",
    paceLabel: "自由节奏",
    outcome: "形成一份自己的成长清单",
    focus: ["自我关怀", "内在资源", "表达练习"],
    courseIds: [11, 21, 14, 8, 2],
    imageUrl:
      "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=1200&q=84",
    discoveryTitle: "自我成长课程，先建立温和的自我支持",
    discoveryDescription:
      "优先展示个人成长、正念和表达类课程，适合想更理解自己、积累长期成长资源的用户。",
  },
];

export const DEFAULT_COURSE_LEARNING_PATH_ID: CourseLearningPathId =
  "emotion-reset";

export function getCourseLearningPath(
  pathId: CourseLearningPathId | string | undefined
): CourseLearningPath {
  return (
    courseLearningPaths.find(path => path.id === pathId) ??
    courseLearningPaths[0]
  );
}

export function getCoursesForLearningPath(
  courses: Course[],
  pathOrId: CourseLearningPath | CourseLearningPathId | string,
  limit = 4
): Course[] {
  const path =
    typeof pathOrId === "string" ? getCourseLearningPath(pathOrId) : pathOrId;
  const coursesById = new Map(courses.map(course => [course.id, course]));
  const selectedById = path.courseIds
    .map(courseId => coursesById.get(courseId))
    .filter((course): course is Course => Boolean(course));
  const categorySet = new Set([
    path.primaryCategory,
    ...path.relatedCategories,
  ]);
  const categoryMatches = courses.filter(course =>
    categorySet.has(course.category)
  );
  const hotFallback = [...courses].sort((a, b) => b.learners - a.learners);
  const uniqueCourses = new Map<number, Course>();

  [...selectedById, ...categoryMatches, ...hotFallback].forEach(course => {
    if (!uniqueCourses.has(course.id)) uniqueCourses.set(course.id, course);
  });

  return Array.from(uniqueCourses.values()).slice(0, limit);
}
