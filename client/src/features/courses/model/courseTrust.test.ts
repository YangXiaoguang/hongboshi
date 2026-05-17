import { describe, expect, it } from "vitest";
import { buildCourseDetail } from "./courseDetail";
import {
  buildCourseTrustProfile,
  createCourseTrustSummary,
} from "./courseTrust";
import type { Course } from "@shared/domain";

const course: Course = {
  id: 2,
  title: "正念减压疗法八周系统训练营",
  coverUrl: "https://example.com/mindfulness.jpg",
  category: "正念冥想",
  type: "直播",
  teacher: "王宇教授",
  learners: 7562,
  price: 998,
  originalPrice: 1299,
  isFree: false,
  isVip: false,
  createdAt: "2026-02-28",
};

describe("course trust model", () => {
  it("builds deterministic trust metrics and proof points from course detail", () => {
    const detail = buildCourseDetail(course);
    const profile = buildCourseTrustProfile(detail);

    expect(profile.metrics).toHaveLength(3);
    expect(profile.metrics[0]).toMatchObject({
      label: "学员评分",
      value: "4.8",
    });
    expect(profile.instructor.title).toBe("王宇教授 主讲");
    expect(profile.instructor.highlights.map(item => item.title)).toContain(
      "内容边界审核"
    );
    expect(profile.feedback[0]?.profile).toBe("正念冥想学习者");
  });

  it("keeps after-sale and privacy FAQ explicit for commerce decisions", () => {
    const detail = buildCourseDetail(course);
    const profile = buildCourseTrustProfile(detail);

    expect(profile.policies.map(item => item.title)).toContain("售后人工核实");
    expect(profile.faqs.map(item => item.question).join(" ")).toContain(
      "支付异常"
    );
    expect(createCourseTrustSummary(detail)).toContain("人学习");
  });
});
