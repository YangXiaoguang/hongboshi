import {
  LoginSessionSchema,
  UserConsentSchema,
  type LoginSession,
  type UserConsent,
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
}

function cloneSession(session: LoginSession): LoginSession {
  return LoginSessionSchema.parse(JSON.parse(JSON.stringify(session)));
}

function cloneConsent(consent: UserConsent): UserConsent {
  return UserConsentSchema.parse(JSON.parse(JSON.stringify(consent)));
}

export class InMemoryAuthSessionStore implements AuthSessionStore {
  private sessions = new Map<string, LoginSession>();
  private consents = new Map<string, UserConsent[]>();

  saveSession(token: string, session: LoginSession): void {
    const normalized = LoginSessionSchema.parse(session);
    this.sessions.set(token, cloneSession(normalized));
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
  }

  getUserConsents(userId: string): UserConsent[] {
    return (this.consents.get(userId) ?? []).map(cloneConsent);
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
