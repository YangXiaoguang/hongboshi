import { describe, expect, it } from "vitest";
import type { CourseDetail } from "@shared/domain";
import {
  createCourseChapterMaterial,
  createEmptyCoursePracticeState,
  getCoursePracticeRecord,
  getCoursePracticeSummary,
  normalizeCoursePracticeState,
  saveCoursePracticeDraft,
  setCoursePracticeCompleted,
} from "./coursePractice";

const course: CourseDetail = {
  id: 3,
  title: "认识抑郁：科学走出情绪阴霾的第一课",
  coverUrl: "https://example.com/course.jpg",
  category: "心理科普",
  type: "录播",
  teacher: "赵磊咨询师",
  learners: 35241,
  price: 0,
  originalPrice: 0,
  isFree: true,
  isVip: false,
  createdAt: "2026-02-25",
  subtitle: "理解情绪低落背后的信号",
  summary: "用科学方式看待抑郁与情绪阴霾。",
  suitableFor: [
    {
      title: "想理解抑郁的人",
      description: "希望先建立基础认知，再选择合适的支持方式。",
    },
  ],
  outcomes: ["区分情绪低落和抑郁信号", "形成一份自我观察清单"],
  supportPath: "学习中如出现明显风险信号，应优先寻求咨询或线下支持。",
  chapters: [
    {
      id: "3-chapter-1",
      title: "看见当下困扰",
      description: "包含课前自评表等素材。",
      durationMinutes: 38,
      lessonCount: 1,
    },
    {
      id: "3-chapter-2",
      title: "建立理解框架",
      description: "包含章节讲义等素材。",
      durationMinutes: 52,
      lessonCount: 1,
    },
    {
      id: "3-chapter-3",
      title: "进入日常练习",
      description: "包含课后行动清单等素材。",
      durationMinutes: 46,
      lessonCount: 1,
    },
  ],
};

describe("course practice model", () => {
  it("saves chapter drafts without mixing them into course progress", () => {
    let state = createEmptyCoursePracticeState();
    state = saveCoursePracticeDraft(
      state,
      course.id,
      "3-chapter-1",
      "  今天记录一次情绪波动  ",
      "2026-05-16T10:00:00.000Z"
    );

    expect(
      getCoursePracticeRecord(state, course.id, "3-chapter-1")
    ).toMatchObject({
      note: "今天记录一次情绪波动",
      isPracticeCompleted: false,
      syncStatus: "local_only",
    });
  });

  it("marks practice completion independently from the draft text", () => {
    let state = createEmptyCoursePracticeState();
    state = setCoursePracticeCompleted(
      state,
      course.id,
      "3-chapter-2",
      true,
      "2026-05-16T10:10:00.000Z"
    );

    expect(
      getCoursePracticeRecord(state, course.id, "3-chapter-2")
    ).toMatchObject({
      note: "",
      isPracticeCompleted: true,
    });
  });

  it("summarizes only records that still match current course chapters", () => {
    let state = createEmptyCoursePracticeState();
    state = saveCoursePracticeDraft(state, course.id, "3-chapter-1", "练习 A");
    state = setCoursePracticeCompleted(state, course.id, "3-chapter-1", true);
    state = setCoursePracticeCompleted(state, course.id, "stale-chapter", true);

    expect(getCoursePracticeSummary(state, course)).toMatchObject({
      totalChapters: 3,
      draftedCount: 1,
      completedCount: 1,
      completedPercent: 33,
    });
  });

  it("normalizes invalid or legacy persisted practice data safely", () => {
    const normalized = normalizeCoursePracticeState({
      records: {
        oldKey: {
          courseId: 3,
          chapterId: "3-chapter-1",
          note: "  保留有效记录  ",
          isPracticeCompleted: true,
          source: "local",
          syncStatus: "synced",
          createdAt: "2026-05-16T10:00:00.000Z",
          updatedAt: "2026-05-16T10:00:00.000Z",
        },
        invalid: {
          courseId: "bad",
        },
      },
    });

    expect(Object.keys(normalized.records)).toEqual(["3:3-chapter-1"]);
    expect(normalized.records["3:3-chapter-1"]?.note).toBe("保留有效记录");
  });

  it("derives a stable material view for the active chapter", () => {
    const material = createCourseChapterMaterial(course, course.chapters[0]);

    expect(material).toMatchObject({
      title: "看见当下困扰讲义",
      summary: "包含课前自评表等素材。",
      sourceLabel: "课程详情内容",
      materialStatus: "placeholder",
    });
    expect(material.keyPoints.length).toBeGreaterThan(1);
  });
});
