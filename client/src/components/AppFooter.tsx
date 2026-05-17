import { toast } from "sonner";
import { useLocation } from "wouter";

const footerLinks = [
  { label: "咨询服务", href: "/consulting" },
  { label: "心理课程", href: "/courses" },
  { label: "成长测评", href: "/assessment" },
  { label: "关于我们", href: "/about" },
  { label: "个人中心", href: "/me" },
];

export default function AppFooter() {
  const [, navigate] = useLocation();

  return (
    <footer className="bg-[#1E332D] text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-10 border-b border-white/12 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DDE8D9] text-sm font-semibold text-[#1E332D]">
                红
              </span>
              <div>
                <p className="font-semibold">红博士心理小讲堂</p>
                <p className="mt-1 text-xs text-white/50">心理咨询与成长陪伴</p>
              </div>
            </div>
            <p className="mt-6 max-w-[520px] text-sm leading-7 text-white/62">
              当生活变得难以承受，这里提供更温和、更专业、更容易开始的支持方式。
            </p>
          </div>

          <nav className="flex flex-wrap gap-3">
            {footerLinks.map(link => (
              <button
                key={link.label}
                onClick={() => navigate(link.href)}
                className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/62 transition hover:border-white/32 hover:text-white"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() =>
                toast("隐私政策", {
                  description: "正式隐私政策页将在合规模块中接入",
                })
              }
              className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/62 transition hover:border-white/32 hover:text-white"
            >
              隐私政策
            </button>
          </nav>
        </div>

        <div className="flex flex-col gap-2 pt-7 text-xs text-white/34 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright &copy; 2026 红博士心理小讲堂 版权所有</p>
          <p>京ICP备XXXXXXXX号-1 | 京公网安备XXXXXXXXXXXXX号</p>
        </div>
      </div>
    </footer>
  );
}
