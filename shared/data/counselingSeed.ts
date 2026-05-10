import {
  CounselorSchema,
  CounselingSlotSchema,
  type Counselor,
  type CounselingChannel,
  type CounselingSlot,
} from "../domain";

export const counselorProfiles = CounselorSchema.array().parse([
  {
    id: "counselor_lin",
    name: "林若安",
    title: "国家二级心理咨询师",
    introduction:
      "擅长情绪低落、焦虑压力和自我价值议题，咨询风格稳定、温和，重视来访者的安全感。",
    specialties: ["emotion", "personal_growth", "trauma"],
    licenseSummary: "心理咨询师执业 9 年，累计个案 3600+ 小时",
    yearsOfPractice: 9,
    sessionPrice: 399,
    rating: 4.9,
  },
  {
    id: "counselor_chen",
    name: "陈予白",
    title: "婚姻家庭咨询师",
    introduction:
      "长期服务亲密关系、婚姻冲突和家庭沟通议题，帮助来访者看见关系中的需求与边界。",
    specialties: ["relationship", "family", "emotion"],
    licenseSummary: "婚姻家庭咨询方向 8 年，EFT 伴侣咨询连续受训",
    yearsOfPractice: 8,
    sessionPrice: 459,
    rating: 4.8,
  },
  {
    id: "counselor_zhao",
    name: "赵明澈",
    title: "青少年与家庭治疗师",
    introduction:
      "关注青少年心理、亲子沟通和学习压力，擅长把家庭系统中的张力转化为可对话的问题。",
    specialties: ["adolescent", "family", "personal_growth"],
    licenseSummary: "青少年心理服务 7 年，家庭治疗系统训练背景",
    yearsOfPractice: 7,
    sessionPrice: 429,
    rating: 4.7,
  },
  {
    id: "counselor_he",
    name: "何静禾",
    title: "职场心理与压力管理顾问",
    introduction:
      "擅长职场耗竭、职业转型和高敏感人群能量管理，咨询中兼顾情绪支持与行动计划。",
    specialties: ["workplace", "emotion", "personal_growth"],
    licenseSummary: "EAP 服务与职场心理咨询 6 年，企业团体带领经验",
    yearsOfPractice: 6,
    sessionPrice: 369,
    rating: 4.8,
  },
]);

const slotHours = [10, 14, 20] as const;
const slotChannels: CounselingChannel[] = ["video", "voice", "video"];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function createSlotDate(base: Date, dayOffset: number, hour: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date;
}

export function generateUpcomingCounselingSlots({
  now = new Date(),
  counselors = counselorProfiles,
}: {
  now?: Date;
  counselors?: Counselor[];
} = {}): CounselingSlot[] {
  const slots = counselors.flatMap((counselor, counselorIndex) =>
    [1, 2, 3, 5].flatMap(dayOffset =>
      slotHours.map((hour, hourIndex) => {
        const startsAt = createSlotDate(
          now,
          dayOffset + (counselorIndex % 2),
          hour
        );
        const endsAt = new Date(startsAt.getTime() + 50 * 60 * 1000);
        const channel = slotChannels[hourIndex];

        return CounselingSlotSchema.parse({
          id: `slot_${counselor.id}_${dateKey(startsAt)}_${hour}`,
          counselorId: counselor.id,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          channel,
          available: true,
        });
      })
    )
  );

  return slots;
}
