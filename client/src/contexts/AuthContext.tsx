/*
 * AuthContext - 用户认证状态管理
 * 管理登录状态、用户信息、登录弹窗显示
 * Mock实现：模拟手机号验证码登录和微信登录
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface UserInfo {
  id: string;
  nickname: string;
  avatar: string;
  phone: string;
  loginMethod: "phone" | "wechat";
}

interface AuthContextType {
  user: UserInfo | null;
  isLoggedIn: boolean;
  showLoginModal: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  loginWithPhone: (phone: string) => void;
  loginWithWechat: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock user data
const mockPhoneUser: UserInfo = {
  id: "u_10001",
  nickname: "心理学爱好者",
  avatar: "",
  phone: "",
  loginMethod: "phone",
};

const mockWechatUser: UserInfo = {
  id: "u_20001",
  nickname: "微信用户_Lily",
  avatar: "",
  phone: "",
  loginMethod: "wechat",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const openLoginModal = useCallback(() => setShowLoginModal(true), []);
  const closeLoginModal = useCallback(() => setShowLoginModal(false), []);

  const loginWithPhone = useCallback((phone: string) => {
    // Mask middle digits of phone number
    const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    setUser({
      ...mockPhoneUser,
      phone,
      nickname: `用户${maskedPhone}`,
    });
    setShowLoginModal(false);
  }, []);

  const loginWithWechat = useCallback(() => {
    setUser({ ...mockWechatUser });
    setShowLoginModal(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        showLoginModal,
        openLoginModal,
        closeLoginModal,
        loginWithPhone,
        loginWithWechat,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
