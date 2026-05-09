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
const AUTH_STORAGE_KEY = "hongboshi.auth.user.v1";

function loadStoredUser(): UserInfo | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserInfo) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user: UserInfo) {
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Ignore local session persistence failures.
  }
}

function clearStoredUser() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore local session persistence failures.
  }
}

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
  const [user, setUser] = useState<UserInfo | null>(() => loadStoredUser());
  const [showLoginModal, setShowLoginModal] = useState(false);

  const openLoginModal = useCallback(() => setShowLoginModal(true), []);
  const closeLoginModal = useCallback(() => setShowLoginModal(false), []);

  const commitUser = useCallback((nextUser: UserInfo) => {
    setUser(nextUser);
    saveStoredUser(nextUser);
    setShowLoginModal(false);
  }, []);

  const loginWithPhone = useCallback((phone: string) => {
    // Mask middle digits of phone number
    const maskedPhone = phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
    commitUser({
      ...mockPhoneUser,
      phone,
      nickname: `用户${maskedPhone}`,
    });
  }, [commitUser]);

  const loginWithWechat = useCallback(() => {
    commitUser({ ...mockWechatUser });
  }, [commitUser]);

  const logout = useCallback(() => {
    setUser(null);
    clearStoredUser();
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
