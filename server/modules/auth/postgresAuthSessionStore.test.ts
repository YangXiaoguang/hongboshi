import { describe, expect, it } from "vitest";
import type {
  DatabaseQueryExecutor,
  DatabaseQueryResult,
} from "../../db/postgres";
import type { LoginSession } from "../../../shared/domain";
import {
  PostgresAuthSessionStore,
  hashAuthToken,
} from "./postgresAuthSessionStore";

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakeAuthExecutor implements DatabaseQueryExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly rows: Record<string, unknown[]> = {}) {}

  async query<Row>(
    text: string,
    values?: readonly unknown[]
  ): Promise<DatabaseQueryResult<Row>> {
    this.queries.push({ text, values });

    if (text.includes("FROM auth_sessions")) {
      return {
        rows: (this.rows.session ?? []) as Row[],
        rowCount: this.rows.session?.length ?? 0,
      };
    }

    if (text.includes("FROM user_roles")) {
      return {
        rows: (this.rows.roles ?? []) as Row[],
        rowCount: this.rows.roles?.length ?? 0,
      };
    }

    if (text.includes("FROM user_consents")) {
      return {
        rows: (this.rows.consents ?? []) as Row[],
        rowCount: this.rows.consents?.length ?? 0,
      };
    }

    return { rows: [] as Row[], rowCount: 0 };
  }
}

function createSession(): LoginSession {
  return {
    user: {
      id: "u_phone_8000",
      displayName: "用户138****8000",
      phoneMasked: "138****8000",
      roles: ["member"],
      isMinor: false,
      createdAt: "2026-05-10T08:00:00.000Z",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    provider: "phone",
    accessTokenExpiresAt: "2026-05-17T08:00:00.000Z",
    consents: [
      {
        userId: "u_phone_8000",
        type: "terms",
        version: "2026.05",
        acceptedAt: "2026-05-10T08:00:00.000Z",
      },
      {
        userId: "u_phone_8000",
        type: "privacy",
        version: "2026.05",
        acceptedAt: "2026-05-10T08:00:00.000Z",
      },
    ],
  };
}

describe("postgres auth session store", () => {
  it("saves users, roles, consents and hashed auth sessions", async () => {
    const db = new FakeAuthExecutor();
    const store = new PostgresAuthSessionStore(db);
    const token = "raw-session-token";

    await store.saveSession(token, createSession());

    expect(
      db.queries.some(query => query.text.includes("INSERT INTO users"))
    ).toBe(true);
    expect(
      db.queries.some(query => query.text.includes("INSERT INTO user_roles"))
    ).toBe(true);
    expect(
      db.queries.some(query => query.text.includes("INSERT INTO user_consents"))
    ).toBe(true);

    const sessionQuery = db.queries.find(query =>
      query.text.includes("INSERT INTO auth_sessions")
    );
    expect(sessionQuery?.values).toEqual([
      `session_${hashAuthToken(token).slice(0, 32)}`,
      "u_phone_8000",
      "phone",
      hashAuthToken(token),
      "2026-05-17T08:00:00.000Z",
    ]);
    expect(sessionQuery?.values).not.toContain(token);
  });

  it("loads an active session from joined PostgreSQL rows", async () => {
    const db = new FakeAuthExecutor({
      session: [
        {
          provider: "phone",
          expires_at: new Date("2026-05-17T08:00:00.000Z"),
          id: "u_phone_8000",
          display_name: "用户138****8000",
          phone_masked: "138****8000",
          avatar_url: null,
          is_minor: false,
          created_at: new Date("2026-05-10T08:00:00.000Z"),
          updated_at: new Date("2026-05-10T08:00:00.000Z"),
        },
      ],
      roles: [{ role: "member" }],
      consents: [
        {
          user_id: "u_phone_8000",
          type: "terms",
          version: "2026.05",
          accepted_at: new Date("2026-05-10T08:00:00.000Z"),
        },
      ],
    });
    const store = new PostgresAuthSessionStore(db);

    const session = await store.getSession("raw-session-token");

    expect(session).toMatchObject({
      provider: "phone",
      user: {
        id: "u_phone_8000",
        roles: ["member"],
        createdAt: "2026-05-10T08:00:00.000Z",
      },
      consents: [{ type: "terms" }],
    });
    expect(db.queries[0]?.values).toEqual([hashAuthToken("raw-session-token")]);
  });

  it("revokes sessions by token hash", async () => {
    const db = new FakeAuthExecutor();
    const store = new PostgresAuthSessionStore(db);

    await store.destroySession("raw-session-token");

    expect(db.queries[0]?.text).toContain("UPDATE auth_sessions");
    expect(db.queries[0]?.values).toEqual([hashAuthToken("raw-session-token")]);
  });

  it("resets auth tables without cascading user-owned business records", async () => {
    const db = new FakeAuthExecutor();
    const store = new PostgresAuthSessionStore(db);

    await store.reset();

    expect(db.queries.map(query => query.text.trim())).toEqual([
      "DELETE FROM auth_sessions",
      "DELETE FROM user_consents",
      "DELETE FROM user_roles",
    ]);
  });
});
