/*
 * AppFooter - 全局页脚
 * 「知性蓝调」设计: 深海蓝背景，与Header呼应
 * 包含: 链接导航、版权信息、备案号
 */

import { toast } from "sonner";

const footerLinks = [
  { label: "关于我们", href: "#" },
  { label: "合作伙伴", href: "#" },
  { label: "免责声明", href: "#" },
  { label: "隐私政策", href: "#" },
  { label: "联系我们", href: "#" },
  { label: "招贤纳士", href: "#" },
];

export default function AppFooter() {
  return (
    <footer style={{ backgroundColor: "#1B365D" }}>
      <div className="max-w-[1200px] mx-auto px-4 lg:px-6">
        {/* Links row */}
        <div className="py-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b border-white/10">
          {footerLinks.map((link, i) => (
            <button
              key={i}
              onClick={() => toast("功能开发中", { description: `「${link.label}」页面即将上线` })}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Copyright row */}
        <div className="py-5 text-center">
          <p className="text-white/40 text-xs leading-relaxed">
            Copyright &copy; 2026 红博士心理小讲堂 版权所有
          </p>
          <p className="text-white/30 text-xs mt-1">
            京ICP备XXXXXXXX号-1 | 京公网安备XXXXXXXXXXXXX号
          </p>
        </div>
      </div>
    </footer>
  );
}
