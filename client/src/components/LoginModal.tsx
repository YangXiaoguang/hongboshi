/*
 * LoginModal - 登录注册弹窗组件
 * 「知性蓝调」设计: 双Tab切换（手机号验证码 / 微信扫码登录）
 * 功能: 手机号格式验证、验证码倒计时、用户协议勾选、微信二维码模拟
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Smartphone,
  MessageSquare,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type LoginTab = "phone" | "wechat";

export default function LoginModal() {
  const { showLoginModal, closeLoginModal, loginWithPhone, loginWithWechat } =
    useAuth();

  const [activeTab, setActiveTab] = useState<LoginTab>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wechatScanning, setWechatScanning] = useState(false);
  const [wechatScanned, setWechatScanned] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (showLoginModal) {
      setActiveTab("phone");
      setPhone("");
      setCode("");
      setAgreed(false);
      setCountdown(0);
      setCodeSent(false);
      setIsSubmitting(false);
      setWechatScanning(false);
      setWechatScanned(false);
      setPhoneError("");
      setCodeError("");
      setTimeout(() => phoneInputRef.current?.focus(), 300);
    }
  }, [showLoginModal]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown > 0]);

  const validatePhone = (value: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!value) {
      setPhoneError("请输入手机号");
      return false;
    }
    if (!phoneRegex.test(value)) {
      setPhoneError("请输入正确的11位手机号");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const validateCode = (value: string): boolean => {
    if (!value) {
      setCodeError("请输入验证码");
      return false;
    }
    if (!/^\d{6}$/.test(value)) {
      setCodeError("请输入6位数字验证码");
      return false;
    }
    setCodeError("");
    return true;
  };

  const handleSendCode = useCallback(() => {
    if (!validatePhone(phone)) return;
    if (countdown > 0) return;

    // Mock sending verification code
    setCodeSent(true);
    setCountdown(60);
    toast("验证码已发送", {
      description: `验证码已发送至 ${phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}`,
      icon: "📱",
    });
  }, [phone, countdown]);

  const handlePhoneLogin = useCallback(async () => {
    const phoneValid = validatePhone(phone);
    const codeValid = validateCode(code);
    if (!phoneValid || !codeValid) return;

    if (!agreed) {
      toast("请先同意用户协议", {
        description: "勾选下方用户协议和隐私政策后即可登录",
        icon: "📋",
      });
      return;
    }

    setIsSubmitting(true);
    await loginWithPhone(phone, code);
    setIsSubmitting(false);
    toast("登录成功", {
      description: "欢迎来到红博士心理小讲堂",
      icon: "🎉",
    });
  }, [phone, code, agreed, loginWithPhone]);

  const handleWechatLogin = useCallback(async () => {
    if (!agreed) {
      toast("请先同意用户协议", {
        description: "勾选下方用户协议和隐私政策后即可登录",
        icon: "📋",
      });
      return;
    }

    // Simulate WeChat scanning process
    setWechatScanning(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setWechatScanning(false);
    setWechatScanned(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await loginWithWechat();
    toast("微信登录成功", {
      description: "欢迎来到红博士心理小讲堂",
      icon: "🎉",
    });
  }, [agreed, loginWithWechat]);

  const handlePhoneChange = (value: string) => {
    // Only allow digits, max 11
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    setPhone(cleaned);
    if (phoneError) setPhoneError("");
  };

  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setCode(cleaned);
    if (codeError) setCodeError("");
  };

  if (!showLoginModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm login-backdrop-enter"
        onClick={closeLoginModal}
      />

      {/* Modal */}
      <div className="relative w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden login-modal-enter">
        {/* Top decorative bar */}
        <div
          className="h-[3px] w-full"
          style={{
            background:
              "linear-gradient(90deg, #243B35 0%, #6F8F83 40%, #7B9E87 70%, #6F8F83 100%)",
          }}
        />

        {/* Close button */}
        <button
          onClick={closeLoginModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="pt-8 pb-4 px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: "#6F8F83" }}
            >
              红
            </div>
            <h2
              className="text-xl font-bold"
              style={{ color: "#243B35" }}
            >
              红博士心理小讲堂
            </h2>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            登录后享受更多课程权益
          </p>
        </div>

        {/* Tab switch */}
        <div className="px-8 mb-5">
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("phone")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "phone"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-400 hover:text-gray-500"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              手机号登录
            </button>
            <button
              onClick={() => setActiveTab("wechat")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === "wechat"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-400 hover:text-gray-500"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.492.492 0 01.177-.554C23.028 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zM14.53 13.39c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983zm4.844 0c.535 0 .969.44.969.983a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983z" />
              </svg>
              微信登录
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="px-8 pb-6">
          {/* ===== Phone Login Tab ===== */}
          {activeTab === "phone" && (
            <div className="login-tab-enter">
              {/* Phone input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  手机号
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400 text-sm pointer-events-none">
                    <span>+86</span>
                    <span className="w-px h-4 bg-gray-200" />
                  </div>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="请输入手机号"
                    maxLength={11}
                    className={`w-full h-11 pl-16 pr-4 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
                      phoneError
                        ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                        : "border-gray-200 focus:ring-blue-100 focus:border-blue-400"
                    }`}
                    style={{ backgroundColor: "#FFFDF8" }}
                  />
                </div>
                {phoneError && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                    {phoneError}
                  </p>
                )}
              </div>

              {/* Verification code input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  验证码
                </label>
                <div className="flex gap-2.5">
                  <div className="relative flex-1">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      placeholder="请输入6位验证码"
                      maxLength={6}
                      className={`w-full h-11 pl-10 pr-4 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
                        codeError
                          ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                          : "border-gray-200 focus:ring-blue-100 focus:border-blue-400"
                      }`}
                      style={{ backgroundColor: "#FFFDF8" }}
                    />
                  </div>
                  <button
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className={`shrink-0 h-11 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                      countdown > 0
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "text-white hover:opacity-90 active:scale-[0.98]"
                    }`}
                    style={
                      countdown > 0
                        ? {}
                        : { backgroundColor: "#6F8F83" }
                    }
                  >
                    {countdown > 0
                      ? `${countdown}s 后重发`
                      : codeSent
                      ? "重新发送"
                      : "获取验证码"}
                  </button>
                </div>
                {codeError && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                    {codeError}
                  </p>
                )}
              </div>

              {/* Login button */}
              <button
                onClick={handlePhoneLogin}
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-5"
                style={{
                  background:
                    "linear-gradient(135deg, #243B35 0%, #6F8F83 100%)",
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    登录 / 注册
                  </>
                )}
              </button>

              {/* Hint text */}
              <p className="text-center text-[11px] text-gray-300 mt-3">
                未注册的手机号将自动创建账号
              </p>
            </div>
          )}

          {/* ===== WeChat Login Tab ===== */}
          {activeTab === "wechat" && (
            <div className="login-tab-enter">
              {/* QR code area */}
              <div className="flex flex-col items-center py-2">
                <div
                  className="relative w-[200px] h-[200px] rounded-2xl border-2 border-dashed flex items-center justify-center mb-4 overflow-hidden"
                  style={{ borderColor: "#7B9E87" }}
                >
                  {/* Mock QR code pattern */}
                  <div className="w-[170px] h-[170px] relative">
                    {/* QR code grid simulation */}
                    <svg viewBox="0 0 170 170" className="w-full h-full">
                      {/* Background */}
                      <rect width="170" height="170" fill="white" />
                      {/* Corner markers */}
                      <rect x="10" y="10" width="40" height="40" rx="4" fill="#243B35" />
                      <rect x="15" y="15" width="30" height="30" rx="2" fill="white" />
                      <rect x="20" y="20" width="20" height="20" rx="1" fill="#243B35" />
                      
                      <rect x="120" y="10" width="40" height="40" rx="4" fill="#243B35" />
                      <rect x="125" y="15" width="30" height="30" rx="2" fill="white" />
                      <rect x="130" y="20" width="20" height="20" rx="1" fill="#243B35" />
                      
                      <rect x="10" y="120" width="40" height="40" rx="4" fill="#243B35" />
                      <rect x="15" y="125" width="30" height="30" rx="2" fill="white" />
                      <rect x="20" y="130" width="20" height="20" rx="1" fill="#243B35" />
                      
                      {/* Data modules - random pattern */}
                      {[
                        [60,10],[70,10],[80,10],[100,10],[110,10],
                        [60,20],[90,20],[110,20],
                        [60,30],[70,30],[80,30],[90,30],[100,30],[110,30],
                        [60,40],[80,40],[100,40],
                        [10,60],[20,60],[30,60],[40,60],[60,60],[70,60],[90,60],[100,60],[120,60],[130,60],[140,60],[150,60],
                        [10,70],[40,70],[60,70],[80,70],[90,70],[110,70],[120,70],[150,70],
                        [10,80],[20,80],[30,80],[40,80],[70,80],[80,80],[100,80],[110,80],[120,80],[130,80],[150,80],
                        [10,90],[40,90],[60,90],[70,90],[90,90],[100,90],[120,90],[140,90],[150,90],
                        [10,100],[20,100],[30,100],[40,100],[60,100],[80,100],[90,100],[110,100],[130,100],[140,100],
                        [10,110],[40,110],[70,110],[80,110],[100,110],[110,110],[120,110],[150,110],
                        [60,120],[70,120],[80,120],[100,120],[130,120],[140,120],[150,120],
                        [60,130],[90,130],[110,130],[120,130],[150,130],
                        [60,140],[70,140],[80,140],[90,140],[100,140],[110,140],[130,140],[140,140],
                        [60,150],[80,150],[100,150],[120,150],[130,150],[150,150],
                      ].map(([x, y], i) => (
                        <rect key={i} x={x} y={y} width="8" height="8" fill="#243B35" opacity={0.85} />
                      ))}
                      
                      {/* Center logo */}
                      <rect x="65" y="65" width="40" height="40" rx="8" fill="white" />
                      <rect x="68" y="68" width="34" height="34" rx="6" fill="#6F8F83" />
                      <text x="85" y="91" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">红</text>
                    </svg>

                    {/* Scanning overlay */}
                    {wechatScanning && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#7B9E87" }} />
                          <span className="text-xs text-gray-500">扫码成功，确认中...</span>
                        </div>
                      </div>
                    )}

                    {/* Scanned success overlay */}
                    {wechatScanned && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-xl">
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-10 h-10" style={{ color: "#7B9E87" }} />
                          <span className="text-xs font-medium" style={{ color: "#7B9E87" }}>登录成功</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scanning line animation */}
                  {!wechatScanning && !wechatScanned && (
                    <div className="absolute top-0 left-0 right-0 h-1 qr-scan-line" style={{ backgroundColor: "#7B9E87" }} />
                  )}
                </div>

                <p className="text-sm text-gray-500 mb-1">
                  请使用微信扫描二维码登录
                </p>
                <p className="text-xs text-gray-300">
                  打开微信 → 扫一扫 → 对准二维码
                </p>

                {/* Simulate scan button (for demo) */}
                {!wechatScanning && !wechatScanned && (
                  <button
                    onClick={handleWechatLogin}
                    className="mt-4 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ backgroundColor: "#7B9E87" }}
                  >
                    模拟扫码登录
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Agreement checkbox */}
          <div className="flex items-start gap-2 mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={() => setAgreed(!agreed)}
              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                agreed
                  ? "border-transparent text-white"
                  : "border-gray-300 text-transparent hover:border-gray-400"
              }`}
              style={agreed ? { backgroundColor: "#6F8F83" } : {}}
            >
              <svg viewBox="0 0 12 12" className="w-3 h-3 fill-current">
                <path d="M10.28 2.28a.75.75 0 00-1.06-1.06L4.5 5.94 2.78 4.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z" />
              </svg>
            </button>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              我已阅读并同意
              <button
                onClick={() => toast("用户协议", { description: "用户服务协议页面即将上线" })}
                className="mx-0.5 underline underline-offset-2 hover:text-gray-600 transition-colors"
                style={{ color: "#6F8F83" }}
              >
                《用户服务协议》
              </button>
              和
              <button
                onClick={() => toast("隐私政策", { description: "隐私政策页面即将上线" })}
                className="mx-0.5 underline underline-offset-2 hover:text-gray-600 transition-colors"
                style={{ color: "#6F8F83" }}
              >
                《隐私政策》
              </button>
            </p>
          </div>
        </div>

        {/* Bottom security hint */}
        <div className="px-8 py-3 bg-gray-50 flex items-center justify-center gap-1.5 text-[11px] text-gray-300">
          <Shield className="w-3 h-3" />
          <span>您的信息将被安全加密保护</span>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        .login-backdrop-enter {
          animation: loginBackdropIn 0.25s ease both;
        }
        .login-modal-enter {
          animation: loginModalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .login-tab-enter {
          animation: loginTabFade 0.3s ease both;
        }
        .qr-scan-line {
          animation: qrScanLine 2.5s ease-in-out infinite;
        }
        @keyframes loginBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes loginModalIn {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes loginTabFade {
          from {
            opacity: 0;
            transform: translateX(8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes qrScanLine {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(196px);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
