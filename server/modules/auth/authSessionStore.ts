import {
  LoginSessionSchema,
  UserConsentSchema,
  UserProfileSchema,
  type LoginSession,
  type UserConsent,
  type UserProfile,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import { PostgresAuthSessionStore } from "./postgresAuthSessionStore";

type MaybePromise<T> = T | Promise<T>;

export interface AuthSessionStore {
  saveSession(token: string, session: LoginSession): MaybePromise<void>;
  getSession(token: string): MaybePromise<LoginSession | null>;
  destroySession(token: string): MaybePromise<void>;
  reset(): MaybePromise<void>;
  getUserConsents(userId: string): MaybePromise<UserConsent[]>;
  listUsers(): MaybePromise<UserProfile[]>;
}

function cloneSession(session: LoginSession): LoginSession {
  return LoginSessionSchema.parse(JSON.parse(JSON.stringify(session)));
}

function cloneConsent(consent: UserConsent): UserConsent {
  return UserConsentSchema.parse(JSON.parse(JSON.stringify(consent)));
}

function cloneUser(user: UserProfile): UserProfile {
  return UserProfileSchema.parse(JSON.parse(JSON.stringify(user)));
}

export class InMemoryAuthSessionStore implements AuthSessionStore {
  private sessions = new Map<string, LoginSession>();
  private consents = new Map<string, UserConsent[]>();
  private users = new Map<string, UserProfile>();

  saveSession(token: string, session: LoginSession): void {
    const normalized = LoginSessionSchema.parse(session);
    this.sessions.set(token, cloneSession(normalized));
    this.users.set(normalized.user.id, cloneUser(normalized.user));
    this.consents.set(
      normalized.user.id,
      normalized.consents.map(cloneConsent)
    );
  }

  getSession(token: string): LoginSession | null {
    const session = this.sessions.get(token);
    return session ? cloneSession(session) : null;
  }

  destroySession(token: string): void {
    this.sessions.delete(token);
  }

  reset(): void {
    this.sessions.clear();
    this.consents.clear();
    this.users.clear();
  }

  getUserConsents(userId: string): UserConsent[] {
    return (this.consents.get(userId) ?? []).map(cloneConsent);
  }

  listUsers(): UserProfile[] {
    return Array.from(this.users.values())
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map(cloneUser);
  }
}

export function createDefaultAuthSessionStore(): AuthSessionStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_AUTH_SESSION_STORE === "memory"
  ) {
    return new InMemoryAuthSessionStore();
  }

  if (
    process.env.HONGBOSHI_AUTH_SESSION_STORE === "postgres" ||
    (process.env.HONGBOSHI_AUTH_SESSION_STORE !== "memory" && getDatabaseUrl())
  ) {
    return new PostgresAuthSessionStore(getSharedPostgresPool());
  }

  return new InMemoryAuthSessionStore();
}
