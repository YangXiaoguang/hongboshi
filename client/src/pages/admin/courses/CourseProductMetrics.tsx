import { motion } from "framer-motion";
import {
  BookOpenCheck,
  CircleDollarSign,
  Layers3,
  UsersRound,
} from "lucide-react";
import type { CourseProductListResult } from "@shared/domain";

function metricItems(data?: CourseProductListResult) {
  const summary = data?.summary;
  return [
    {
      label: "课程商品",
      value: summary?.totalCount ?? 0,
      icon: Layers3,
    },
    {
      label: "已上架",
      value: summary?.publishedCount ?? 0,
      icon: BookOpenCheck,
    },
    {
      label: "免费课程",
      value: summary?.freeCount ?? 0,
      icon: CircleDollarSign,
    },
    {
      label: "会员权益",
      value: summary?.memberIncludedCount ?? 0,
      icon: UsersRound,
    },
  ];
}

export function CourseProductMetrics({
  data,
}: {
  data?: CourseProductListResult;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="mt-6 grid border-y border-[#E1D7C8] bg-[#FFFDF8] md:grid-cols-4"
    >
      {metricItems(data).map(item => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex items-center justify-between border-b border-[#E8DED0] px-4 py-4 md:border-b-0 md:border-r last:md:border-r-0"
          >
            <div>
              <p className="text-xs text-[#8A8176]">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[#243B35]">
                {item.value}
              </p>
            </div>
            <Icon className="h-5 w-5 text-[#6F8F83]" />
          </div>
        );
      })}
    </motion.section>
  );
}
