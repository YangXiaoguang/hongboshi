import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GitBranch,
  Layers3,
  type LucideIcon,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminShellPrinciples,
  getAvailableAdminNavigationItems,
  getPlannedAdminNavigationItems,
} from "@/features/admin/adminNavigation";

const implementationRows = [
  ["M1", "统一后台框架", "已完成", "统一入口、导航、鉴权和现有后台页面接入"],
  ["M2-A", "课程商品列表", "已完成", "只读商品契约、列表、筛选和分页"],
  ["M2-B", "商品状态动作", "已完成", "上下架、价格编辑、原因记录和审计日志"],
  ["M2-C", "发布联动", "已完成", "前台只展示已上架课程，商品状态持久化"],
  [
    "M2-D",
    "商品数据库化",
    "已完成",
    "PostgreSQL Store、基础信息编辑和迁移契约",
  ],
  ["M2-E", "内容审核流", "已完成", "审核状态、驳回原因、详情契约和发布保护"],
  ["M2-F", "详情内容管理", "已完成", "详情内容 Store、章节素材和复审保护"],
  ["M2-G", "内容数据库化", "已完成", "PostgreSQL Store、批量校验和审核前校验"],
  ["M2-H", "权限细化", "已完成", "课程商品资源级权限和素材字段预留"],
  [
    "M3-A",
    "用户与会员只读台",
    "已完成",
    "用户检索、会员权益摘要、账号状态和隐私边界",
  ],
  ["M3-B", "会员权益操作", "已完成", "会员开通、延期、到期处理和审计记录"],
  ["M4-A", "订单只读台", "已完成", "课程、咨询和会员订单的统一只读视图"],
  ["M4-B", "订单状态动作", "已完成", "待支付关闭、异常标记和操作审计"],
  ["M5-A", "交易流水只读台", "已完成", "支付/退款流水、回调状态和异常摘要"],
  ["M5-B", "退款申请动作", "已完成", "退款申请、异常工单和操作审计"],
  ["M5-C", "交易操作数据库化", "已完成", "PostgreSQL Store 和渠道适配接口"],
  ["M6-A", "财务只读台", "已完成", "财务口径、收入退款汇总和明细"],
  ["M6-B", "财务导出基础", "已完成", "CSV 导出、生成时间、筛选快照和预留字段"],
  ["M6-C", "账期手续费规则", "已完成", "账期规则、渠道手续费和结算预览"],
  ["M7-A", "咨询排班运营", "已完成", "咨询师排班、服务状态和规则版本"],
  ["M7-B", "服务记录异常", "已完成", "服务记录、履约异常和隐私最小化"],
] as const;

const overviewMetrics: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}[] = [
  { label: "已接入模块", value: 0, icon: Layers3 },
  { label: "下一阶段", value: "M7-C", icon: GitBranch },
  { label: "后台原则", value: 0, icon: ClipboardCheck },
  { label: "可追踪文档", value: 3, icon: FileText },
];

export default function AdminHome() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const availableItems = getAvailableAdminNavigationItems(user).filter(
    item => item.key !== "overview"
  );
  const plannedItems = getPlannedAdminNavigationItems(user);

  return (
    <div className="text-[#243B35]">
      <section className="flex flex-col gap-4 border-b border-[#E1D7C8] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B7E6D]">
            运营管理后台
          </p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
            业务运营总览
          </h1>
          <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#6F7771]">
            当前后台已接入咨询排班运营、服务记录与履约异常、支付对账、课程商品、用户会员、订单管理、交易退款、财务只读、财务导出和账期手续费规则，后续按咨询师档案、质检和风险复核逐步扩展。
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/finance")}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-[#243B35] px-4 text-sm font-semibold text-white transition hover:bg-[#315047]"
        >
          进入可用模块
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 grid border-y border-[#E1D7C8] bg-[#FFFDF8] md:grid-cols-4"
      >
        {overviewMetrics.map(metric => {
          const Icon = metric.icon;
          const value =
            metric.label === "已接入模块"
              ? availableItems.length
              : metric.label === "后台原则"
                ? adminShellPrinciples.length
                : metric.value;
          return (
            <div
              key={metric.label}
              className="flex items-center justify-between border-b border-[#E8DED0] px-4 py-4 md:border-b-0 md:border-r last:md:border-r-0"
            >
              <div>
                <p className="text-xs text-[#8A8176]">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#243B35]">
                  {value}
                </p>
              </div>
              <Icon className="h-5 w-5 text-[#6F8F83]" />
            </div>
          );
        })}
      </motion.section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
          <div className="flex items-center justify-between gap-3 border-b border-[#E8DED0] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">当前可用模块</h2>
              <p className="mt-1 text-xs text-[#8A8176]">
                这些模块已经接入统一后台 shell，可直接进入处理。
              </p>
            </div>
            <span className="rounded-full bg-[#E5ECE1] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
              {availableItems.length} 个
            </span>
          </div>

          <div className="divide-y divide-[#E8DED0]">
            {availableItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: index * 0.04 }}
                  onClick={() => navigate(item.href)}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#FBF7EF]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6EDDF] text-[#41675A]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#243B35]">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#66716A]">
                      {item.description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-[#9A8F82] transition group-hover:translate-x-0.5 group-hover:text-[#41675A]" />
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-[#6F8F83]" />
            后台工程原则
          </div>
          <div className="mt-4 space-y-3">
            {adminShellPrinciples.map(principle => (
              <div
                key={principle}
                className="flex items-center gap-3 rounded-lg bg-[#F8F3EA] px-3 py-2 text-sm text-[#5F6B64]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#6F8F83]" />
                {principle}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#8A8176]">
            后续每个后台模块都按共享契约、服务端状态机、权限审计、测试和文档更新的顺序推进。
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
          <div className="border-b border-[#E8DED0] px-5 py-4">
            <h2 className="text-sm font-semibold">实施路线</h2>
            <p className="mt-1 text-xs text-[#8A8176]">
              当前连续执行状态已经完成 M7-B
              服务记录与履约异常基础，下一步进入咨询师档案与资质服务状态。
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-[#F8F3EA] text-xs text-[#8A8176]">
                <tr>
                  <th className="px-5 py-3 font-semibold">阶段</th>
                  <th className="px-5 py-3 font-semibold">模块</th>
                  <th className="px-5 py-3 font-semibold">状态</th>
                  <th className="px-5 py-3 font-semibold">范围</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED0]">
                {implementationRows.map(row => (
                  <tr key={row[0]} className="text-[#5F6B64]">
                    <td className="px-5 py-3 font-semibold text-[#243B35]">
                      {row[0]}
                    </td>
                    <td className="px-5 py-3">{row[1]}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-[#E6EDDF] px-2.5 py-1 text-xs font-semibold text-[#41675A]">
                        {row[2]}
                      </span>
                    </td>
                    <td className="px-5 py-3">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] p-5 shadow-sm shadow-[#243B35]/5">
          <div className="text-sm font-semibold">规划中模块</div>
          <div className="mt-4 space-y-3">
            {plannedItems.slice(0, 5).map(item => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F1E8DC] text-[#7B817C]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[#8A8176]">
                      {item.milestone} · {item.description}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
