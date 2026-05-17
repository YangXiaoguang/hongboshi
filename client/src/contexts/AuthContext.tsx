/*
 * AuthContext - 用户认证状态管理
 * 管理登录状态、用户信息、登录弹窗显示。
 * 通过服务端 session API 管理登录状态，开发期保留本地 fallback。
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  CURRENT_USER_CONSENT_VERSION,
  type LoginProvider,
  type LoginSession,
  type UserProfileUpdateRequest,
  type UserRole,
} from "@shared/domain";
import { httpAuthRepository } from "@/features/auth/api/httpAuthRepository";

export interface UserInfo {
  id: string;
  nickname: string;
  avatar: string;
  phoneMasked?: string;
  loginMethod: LoginProvider;
  roles: UserRole[];
  sessionExpiresAt: string;
}

interface AuthContextType {
  user: UserInfo | null;
  isLoggedIn: boolean;
  isAuthSyncing: boolean;
  authError?: string;
  showLoginModal: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  loginWithPhone: (phone: string, code: string) => Promise<void>;
  loginWithWechat: () => Promise<void>;
  updateProfile: (request: UserProfileUpdateRequest) => Promise<void>;
  logout: () => Promise<void>;
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
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Ignore local session persistence failures.
  }
}

function clearStoredUser() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore local session persistence failures.
  }
}

function maskPhone(phone: string) {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

function sessionToUserInfo(session: LoginSession): UserInfo {
  return {
    id: session.user.id,
    nickname: session.user.displayName,
    avatar: session.user.avatarUrl ?? "",
    phoneMasked: session.user.phoneMasked,
    loginMethod: session.provider,
    roles: session.user.roles,
    sessionExpiresAt: session.accessTokenExpiresAt,
  };
}

function createFallbackSession(
  provider: LoginProvider,
  phone?: string
): LoginSession {
  const now = new Date().toISOString();
  const accessTokenExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const phoneMasked = phone ? maskPhone(phone) : undefined;

  return {
    provider,
    accessTokenExpiresAt,
    user: {
      id:
        provider === "phone"
          ? `u_phone_${phone?.slice(-4) ?? "demo"}`
          : "u_wechat_demo",
      displayName:
        provider === "phone" && phoneMasked
          ? `用户${phoneMasked}`
          : "微信用户_Lily",
      phoneMasked,
      roles: ["member"],
      isMinor: false,
      createdAt: now,
      updatedAt: now,
    },
    consents: (["terms", "privacy"] as const).map(type => ({
      userId:
        provider === "phone"
          ? `u_phone_${phone?.slice(-4) ?? "demo"}`
          : "u_wechat_demo",
      type,
      version: CURRENT_USER_CONSENT_VERSION,
      acceptedAt: now,
    })),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => loadStoredUser());
  const [isAuthSyncing, setIsAuthSyncing] = useState(true);
  const [authError, setAuthError] = useState<string | undefined>();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const openLoginModal = useCallback(() => setShowLoginModal(true), []);
  const closeLoginModal = useCallback(() => setShowLoginModal(false), []);

  const commitSession = useCallback((session: LoginSession) => {
    const nextUser = sessionToUserInfo(session);
    setUser(nextUser);
    saveStoredUser(nextUser);
    setShowLoginModal(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    httpAuthRepository
      .getSession()
      .then(session => {
        if (!mounted) return;

        if (session) {
          commitSession(session);
          setAuthError(undefined);
          return;
        }

        setUser(null);
        clearStoredUser();
      })
      .catch(err => {
        if (!mounted) return;
        setAuthError(err instanceof Error ? err.message : "登录服务暂时不可用");
      })
      .finally(() => {
        if (mounted) setIsAuthSyncing(false);
      });

    return () => {
      mounted = false;
    };
  }, [commitSession]);

  const loginWithPhone = useCallback(
    async (phone: string, code: string) => {
      setIsAuthSyncing(true);
      try {
        const session = await httpAuthRepository.loginWithPhone(phone, code);
        commitSession(session);
        setAuthError(undefined);
      } catch (err) {
        commitSession(createFallbackSession("phone", phone));
        setAuthError(err instanceof Error ? err.message : "登录服务暂时不可用");
      } finally {
        setIsAuthSyncing(false);
      }
    },
    [commitSession]
  );

  const loginWithWechat = useCallback(async () => {
    setIsAuthSyncing(true);
    try {
      const session = await httpAuthRepository.loginWithWechat();
      commitSession(session);
      setAuthError(undefined);
    } catch (err) {
      commitSession(createFallbackSession("wechat"));
      setAuthError(err instanceof Error ? err.message : "登录服务暂时不可用");
    } finally {
      setIsAuthSyncing(false);
    }
  }, [commitSession]);

  const updateProfile = useCallback(
    async (request: UserProfileUpdateRequest) => {
      setIsAuthSyncing(true);
      try {
        const session = await httpAuthRepository.updateProfile(request);
        commitSession(session);
        setAuthError(undefined);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "账号资料暂时无法保存";
        setAuthError(message);
        throw new Error(message);
      } finally {
        setIsAuthSyncing(false);
      }
    },
    [commitSession]
  );

  const logout = useCallback(async () => {
    try {
      await httpAuthRepository.logout();
      setAuthError(undefined);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "登录服务暂时不可用");
    } finally {
      setUser(null);
      clearStoredUser();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isAuthSyncing,
        authError,
        showLoginModal,
        openLoginModal,
        closeLoginModal,
        loginWithPhone,
        loginWithWechat,
        updateProfile,
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
