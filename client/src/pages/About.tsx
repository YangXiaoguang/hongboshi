import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  HeartHandshake,
  LockKeyhole,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import AppFooter from "@/components/AppFooter";
import AppHeader from "@/components/AppHeader";

const heroImage =
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1800&h=1200&fit=crop&crop=faces";

const principles = [
  {
    icon: BookOpenCheck,
    title: "课程先行",
    description:
      "用结构化课程降低开始成本，让用户先获得清楚、可复习的心理教育内容。",
  },
  {
    icon: MessageCircleHeart,
    title: "咨询承接",
    description:
      "当自助学习不够时，通过咨询预约把用户带到更合适的专业支持路径。",
  },
  {
    icon: LockKeyhole,
    title: "隐私最小化",
    description:
      "后台只展示运营必需摘要，不把测评答案、咨询说明和风险原文扩散到无关页面。",
  },
];

const serviceLines = [
  "心理课程：情绪、睡眠、关系、家庭教育、职场压力和自我成长。",
  "成长空间：学习计划、进度记录、练习沉淀和阶段证明预览。",
  "咨询服务：预约、改期、取消、履约记录和风险边界提示。",
  "运营后台：课程、订单、交易、财务、风险和审计可持续治理。",
];

const platformMetrics = [
  { label: "课程主题", value: "10+", icon: Brain },
  { label: "服务链路", value: "4", icon: Sparkles },
  { label: "后台模块", value: "9", icon: ShieldCheck },
  { label: "隐私原则", value: "最小化", icon: UsersRound },
];

export default function About() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#F8F3EA] text-[#243B35]">
      <AppHeader />

      <main>
        <section className="relative min-h-[calc(100svh-62px)] overflow-hidden">
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#172620]/86 via-[#172620]/58 to-[#172620]/18" />
          <div className="relative mx-auto flex min-h-[calc(100svh-62px)] max-w-[1240px] flex-col justify-center px-5 py-16 sm:px-8 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-[640px]"
            >
              <p className="text-sm font-semibold text-[#C7D8C2]">关于我们</p>
              <h1 className="mt-4 text-5xl font-semibold leading-[1.04] tracking-normal text-white sm:text-6xl lg:text-7xl">
                红博士心理小讲堂
              </h1>
              <p className="mt-6 max-w-[560px] text-base leading-8 text-white/72">
                我们把心理课程、成长记录和咨询服务放在同一条清晰路径里，让专业支持更容易开始，也更容易被持续管理。
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/courses")}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#DDE8D9] px-6 text-sm font-semibold text-[#243B35] transition hover:bg-white"
                >
                  浏览课程
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/consulting")}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/22 px-6 text-sm font-semibold text-white/82 transition hover:border-white/42 hover:text-white"
                >
                  预约咨询
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1240px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-sm font-semibold text-[#6F8F83]">我们相信</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              心理服务不该只在问题严重时才出现。
            </h2>
          </motion.div>

          <div className="space-y-5 text-sm leading-8 text-[#5F6B64]">
            <p>
              很多人真正需要的是一个能慢慢开始、能反复回看、能在必要时转入更专业支持的系统。红博士心理小讲堂围绕课程交易、学习档案、咨询预约和运营治理搭建产品，让学习、购买、履约与风险边界形成闭环。
            </p>
            <p>
              平台内容强调心理教育和成长陪伴，不替代医疗诊断、药物治疗或危机干预。遇到高风险情况时，我们会优先提示线下专业机构和紧急支持渠道。
            </p>
          </div>
        </section>

        <section className="bg-[#FFFDF8]">
          <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 lg:px-12">
            <div className="grid gap-6 md:grid-cols-3">
              {principles.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{
                      duration: 0.42,
                      delay: index * 0.06,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="border-t border-[#D8CDBC] pt-6"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E6EDDF] text-[#41675A]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-xl font-semibold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#6D746F]">
                      {item.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1240px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-12">
          <div className="overflow-hidden rounded-lg">
            <img
              src="https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1200&h=900&fit=crop"
              alt=""
              className="h-full min-h-[420px] w-full object-cover"
            />
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold text-[#6F8F83]">服务范围</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              从购买课程到获得支持，每一步都应清楚可追踪。
            </h2>
            <div className="mt-8 space-y-4">
              {serviceLines.map(line => (
                <div key={line} className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#6F8F83]" />
                  <p className="text-sm leading-7 text-[#5F6B64]">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#243B35] text-white">
          <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-16 sm:px-8 md:grid-cols-4 lg:px-12">
            {platformMetrics.map(metric => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="border-t border-white/16 pt-5"
                >
                  <Icon className="h-5 w-5 text-[#C7D8C2]" />
                  <p className="mt-5 text-4xl font-semibold">{metric.value}</p>
                  <p className="mt-2 text-sm text-white/56">{metric.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[900px] px-5 py-16 text-center sm:px-8">
          <HeartHandshake className="mx-auto h-8 w-8 text-[#6F8F83]" />
          <h2 className="mt-5 text-3xl font-semibold leading-tight">
            先从一门合适的课程开始。
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-sm leading-7 text-[#6D746F]">
            你可以浏览课程、收藏感兴趣的主题，也可以在需要时进入咨询服务。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate("/courses")}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#243B35] px-5 text-sm font-semibold text-white transition hover:bg-[#315047]"
            >
              心理课程
            </button>
            <button
              onClick={() => navigate("/me")}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#D8CDBC] px-5 text-sm font-semibold text-[#41675A] transition hover:bg-[#F2F7EE]"
            >
              个人中心
            </button>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
