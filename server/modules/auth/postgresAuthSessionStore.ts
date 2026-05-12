import { createHash } from "crypto";
import {
  LoginSessionSchema,
  UserConsentSchema,
  UserProfileSchema,
  type LoginProvider,
  type LoginSession,
  type UserConsent,
  type UserProfile,
  type UserRole,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";

type UserRow = {
  id: string;
  display_name: string;
  phone_masked: string | null;
  avatar_url: string | null;
  is_minor: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

type RoleRow = {
  role: UserRole;
};

type ConsentRow = {
  user_id: string;
  type: UserConsent["type"];
  version: string;
  accepted_at: string | Date;
};

type SessionRow = {
  provider: LoginProvider;
  expires_at: string | Date;
} & UserRow;

function toDateTimeLike(value: string | Date) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionIdForToken(token: string) {
  return `session_${hashAuthToken(token).slice(0, 32)}`;
}

function userRowToProfile(row: UserRow, roles: UserRole[]): UserProfile {
  return UserProfileSchema.parse({
    id: row.id,
    displayName: row.display_name,
    phoneMasked: row.phone_masked ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    roles,
    isMinor: row.is_minor,
    createdAt: toDateTimeLike(row.created_at),
    updatedAt: toDateTimeLike(row.updated_at),
  });
}

function consentRowToDomain(row: ConsentRow): UserConsent {
  return UserConsentSchema.parse({
    userId: row.user_id,
    type: row.type,
    version: row.version,
    acceptedAt: toDateTimeLike(row.accepted_at),
  });
}

export class PostgresAuthSessionStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async saveSession(token: string, session: LoginSession): Promise<void> {
    const normalized = LoginSessionSchema.parse(session);
    const user = normalized.user;

    await this.db.query(
      `
        INSERT INTO users (
          id,
          display_name,
          phone_masked,
          avatar_url,
          is_minor,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          phone_masked = EXCLUDED.phone_masked,
          avatar_url = EXCLUDED.avatar_url,
          is_minor = EXCLUDED.is_minor,
          updated_at = EXCLUDED.updated_at
      `,
      [
        user.id,
        user.displayName,
        user.phoneMasked ?? null,
        user.avatarUrl ?? null,
        user.isMinor,
        user.createdAt,
        user.updatedAt,
      ]
    );

    await this.db.query("DELETE FROM user_roles WHERE user_id = $1", [user.id]);
    for (const role of user.roles) {
      await this.db.query(
        `
          INSERT INTO user_roles (user_id, role)
          VALUES ($1, $2)
          ON CONFLICT (user_id, role) DO NOTHING
        `,
        [user.id, role]
      );
    }

    for (const consent of normalized.consents) {
      await this.db.query(
        `
          INSERT INTO user_consents (
            user_id,
            type,
            version,
            accepted_at
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, type, version) DO UPDATE SET
            accepted_at = EXCLUDED.accepted_at
        `,
        [consent.userId, consent.type, consent.version, consent.acceptedAt]
      );
    }

    await this.db.query(
      `
        INSERT INTO auth_sessions (
          id,
          user_id,
          provider,
          token_hash,
          expires_at,
          revoked_at
        )
        VALUES ($1, $2, $3, $4, $5, NULL)
        ON CONFLICT (token_hash) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          provider = EXCLUDED.provider,
          expires_at = EXCLUDED.expires_at,
          revoked_at = NULL
      `,
      [
        sessionIdForToken(token),
        user.id,
        normalized.provider,
        hashAuthToken(token),
        normalized.accessTokenExpiresAt,
      ]
    );
  }

  async getSession(token: string): Promise<LoginSession | null> {
    const sessionResult = await this.db.query<SessionRow>(
      `
        SELECT
          auth_sessions.provider,
          auth_sessions.expires_at,
          users.id,
          users.display_name,
          users.phone_masked,
          users.avatar_url,
          users.is_minor,
          users.created_at,
          users.updated_at
        FROM auth_sessions
        INNER JOIN users
          ON users.id = auth_sessions.user_id
        WHERE auth_sessions.token_hash = $1
          AND auth_sessions.revoked_at IS NULL
          AND auth_sessions.expires_at > NOW()
        LIMIT 1
      `,
      [hashAuthToken(token)]
    );
    const row = sessionResult.rows[0];
    if (!row) return null;

    const [roles, consents] = await Promise.all([
      this.db.query<RoleRow>(
        `
          SELECT role
          FROM user_roles
          WHERE user_id = $1
          ORDER BY role ASC
        `,
        [row.id]
      ),
      this.db.query<ConsentRow>(
        `
          SELECT
            user_id,
            type,
            version,
            accepted_at
          FROM user_consents
          WHERE user_id = $1
          ORDER BY accepted_at ASC, type ASC
        `,
        [row.id]
      ),
    ]);

    return LoginSessionSchema.parse({
      user: userRowToProfile(
        row,
        roles.rows.map(role => role.role)
      ),
      provider: row.provider,
      accessTokenExpiresAt: toDateTimeLike(row.expires_at),
      consents: consents.rows.map(consentRowToDomain),
    });
  }

  async destroySession(token: string): Promise<void> {
    await this.db.query(
      `
        UPDATE auth_sessions
        SET revoked_at = NOW()
        WHERE token_hash = $1
      `,
      [hashAuthToken(token)]
    );
  }

  async reset(): Promise<void> {
    await this.db.query("DELETE FROM auth_sessions");
    await this.db.query("DELETE FROM user_consents");
    await this.db.query("DELETE FROM user_roles");
  }

  async getUserConsents(userId: string): Promise<UserConsent[]> {
    const result = await this.db.query<ConsentRow>(
      `
        SELECT
          user_id,
          type,
          version,
          accepted_at
        FROM user_consents
        WHERE user_id = $1
        ORDER BY accepted_at ASC, type ASC
      `,
      [userId]
    );

    return result.rows.map(consentRowToDomain);
  }

  async listUsers(): Promise<UserProfile[]> {
    const [users, roles] = await Promise.all([
      this.db.query<UserRow>(
        `
          SELECT
            id,
            display_name,
            phone_masked,
            avatar_url,
            is_minor,
            created_at,
            updated_at
          FROM users
          ORDER BY updated_at DESC, created_at DESC
        `
      ),
      this.db.query<{ user_id: string; role: UserRole }>(
        `
          SELECT user_id, role
          FROM user_roles
          ORDER BY role ASC
        `
      ),
    ]);

    const rolesByUserId = new Map<string, UserRole[]>();
    for (const role of roles.rows) {
      rolesByUserId.set(role.user_id, [
        ...(rolesByUserId.get(role.user_id) ?? []),
        role.role,
      ]);
    }

    return users.rows.map(row =>
      userRowToProfile(row, rolesByUserId.get(row.id) ?? ["visitor"])
    );
  }
}
