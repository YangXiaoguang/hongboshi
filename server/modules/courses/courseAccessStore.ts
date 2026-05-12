import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  CourseAccessStateSchema,
  UserAdminMembershipAuditEventSchema,
  createEmptyCourseAccessState,
  normalizeCourseAccessState,
  type CourseAccessState,
  type UserAdminMembershipAuditEvent,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import { PostgresCourseAccessStore } from "./postgresCourseAccessStore";

type MaybePromise<T> = T | Promise<T>;

const CourseAccessStoreFileSchema = z.object({
  version: z.literal(1),
  users: z.record(z.string().min(1), CourseAccessStateSchema).default({}),
  membershipAuditEvents: z
    .record(z.string().min(1), z.array(UserAdminMembershipAuditEventSchema))
    .default({}),
});

type CourseAccessStoreFile = z.infer<typeof CourseAccessStoreFileSchema>;

export interface CourseAccessStore {
  load(userId: string): MaybePromise<CourseAccessState>;
  listUserStates(): MaybePromise<
    Array<{ userId: string; state: CourseAccessState }>
  >;
  save(
    userId: string,
    state: CourseAccessState
  ): MaybePromise<CourseAccessState>;
  listMembershipAuditEvents(
    userId: string
  ): MaybePromise<UserAdminMembershipAuditEvent[]>;
  appendMembershipAuditEvent(
    event: UserAdminMembershipAuditEvent
  ): MaybePromise<UserAdminMembershipAuditEvent>;
  reset(userId: string, state?: CourseAccessState): MaybePromise<void>;
  clear(): MaybePromise<void>;
}

function emptyStoreFile(): CourseAccessStoreFile {
  return {
    version: 1,
    users: {},
    membershipAuditEvents: {},
  };
}

function cloneState(state: CourseAccessState): CourseAccessState {
  return normalizeCourseAccessState(JSON.parse(JSON.stringify(state)));
}

function cloneMembershipAuditEvent(
  event: UserAdminMembershipAuditEvent
): UserAdminMembershipAuditEvent {
  return UserAdminMembershipAuditEventSchema.parse(
    JSON.parse(JSON.stringify(event))
  );
}

function sortMembershipAuditEvents(
  events: UserAdminMembershipAuditEvent[]
): UserAdminMembershipAuditEvent[] {
  return [...events].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

function normalizeStoreFile(payload: unknown): CourseAccessStoreFile {
  const parsed = CourseAccessStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyStoreFile();

  return {
    version: 1,
    users: Object.fromEntries(
      Object.entries(parsed.data.users).map(([userId, state]) => [
        userId,
        normalizeCourseAccessState(state),
      ])
    ),
    membershipAuditEvents: Object.fromEntries(
      Object.entries(parsed.data.membershipAuditEvents).map(
        ([userId, events]) => [
          userId,
          sortMembershipAuditEvents(events.map(cloneMembershipAuditEvent)),
        ]
      )
    ),
  };
}

export class InMemoryCourseAccessStore implements CourseAccessStore {
  private states = new Map<string, CourseAccessState>();
  private membershipAuditEvents = new Map<
    string,
    UserAdminMembershipAuditEvent[]
  >();

  load(userId: string): CourseAccessState {
    const state = this.states.get(userId);
    return state ? cloneState(state) : createEmptyCourseAccessState();
  }

  listUserStates(): Array<{ userId: string; state: CourseAccessState }> {
    return Array.from(this.states.entries()).map(([userId, state]) => ({
      userId,
      state: cloneState(state),
    }));
  }

  save(userId: string, state: CourseAccessState): CourseAccessState {
    const normalized = normalizeCourseAccessState(state);
    this.states.set(userId, cloneState(normalized));
    return cloneState(normalized);
  }

  listMembershipAuditEvents(userId: string): UserAdminMembershipAuditEvent[] {
    return sortMembershipAuditEvents(
      this.membershipAuditEvents.get(userId) ?? []
    ).map(cloneMembershipAuditEvent);
  }

  appendMembershipAuditEvent(
    event: UserAdminMembershipAuditEvent
  ): UserAdminMembershipAuditEvent {
    const normalized = cloneMembershipAuditEvent(event);
    const events = this.membershipAuditEvents.get(event.userId) ?? [];
    this.membershipAuditEvents.set(event.userId, [
      normalized,
      ...events.map(cloneMembershipAuditEvent),
    ]);
    return cloneMembershipAuditEvent(normalized);
  }

  reset(userId: string, state = createEmptyCourseAccessState()) {
    this.save(userId, state);
  }

  clear() {
    this.states.clear();
    this.membershipAuditEvents.clear();
  }
}

export class JsonFileCourseAccessStore implements CourseAccessStore {
  constructor(private readonly filePath = resolveCourseAccessStorePath()) {}

  load(userId: string): CourseAccessState {
    const file = this.readFile();
    const state = file.users[userId];
    return state ? cloneState(state) : createEmptyCourseAccessState();
  }

  listUserStates(): Array<{ userId: string; state: CourseAccessState }> {
    const file = this.readFile();
    return Object.entries(file.users).map(([userId, state]) => ({
      userId,
      state: cloneState(state),
    }));
  }

  save(userId: string, state: CourseAccessState): CourseAccessState {
    const normalized = normalizeCourseAccessState(state);
    const file = this.readFile();
    file.users[userId] = normalized;
    this.writeFile(file);
    return cloneState(normalized);
  }

  listMembershipAuditEvents(userId: string): UserAdminMembershipAuditEvent[] {
    const file = this.readFile();
    return sortMembershipAuditEvents(
      file.membershipAuditEvents[userId] ?? []
    ).map(cloneMembershipAuditEvent);
  }

  appendMembershipAuditEvent(
    event: UserAdminMembershipAuditEvent
  ): UserAdminMembershipAuditEvent {
    const normalized = cloneMembershipAuditEvent(event);
    const file = this.readFile();
    const events = file.membershipAuditEvents[event.userId] ?? [];
    file.membershipAuditEvents[event.userId] = sortMembershipAuditEvents([
      normalized,
      ...events,
    ]);
    this.writeFile(file);
    return cloneMembershipAuditEvent(normalized);
  }

  reset(userId: string, state = createEmptyCourseAccessState()) {
    const file = this.readFile();
    file.users[userId] = normalizeCourseAccessState(state);
    this.writeFile(file);
  }

  clear() {
    this.writeFile(emptyStoreFile());
  }

  private readFile(): CourseAccessStoreFile {
    if (!fs.existsSync(this.filePath)) return emptyStoreFile();

    try {
      return normalizeStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyStoreFile();
    }
  }

  private writeFile(file: CourseAccessStoreFile) {
    const normalized = normalizeStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

export function resolveCourseAccessStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COURSE_ACCESS_FILE ??
      ".hongboshi-data/course-access.json"
  );
}

export function createDefaultCourseAccessStore(): CourseAccessStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COURSE_ACCESS_STORE === "memory"
  ) {
    return new InMemoryCourseAccessStore();
  }

  if (
    process.env.HONGBOSHI_COURSE_ACCESS_STORE === "postgres" ||
    (process.env.HONGBOSHI_COURSE_ACCESS_STORE !== "file" && getDatabaseUrl())
  ) {
    return new PostgresCourseAccessStore(getSharedPostgresPool());
  }

  return new JsonFileCourseAccessStore();
}
