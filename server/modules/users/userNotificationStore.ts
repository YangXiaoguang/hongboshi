import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  UserNotificationSchema,
  type UserNotification,
} from "../../../shared/domain";

type MaybePromise<T> = T | Promise<T>;

const UserNotificationStoreFileSchema = z.object({
  version: z.literal(1),
  notifications: z.array(UserNotificationSchema).default([]),
});

type UserNotificationStoreFile = z.infer<
  typeof UserNotificationStoreFileSchema
>;

export interface UserNotificationStore {
  listByUserId(userId: string): MaybePromise<UserNotification[]>;
  append(notification: UserNotification): MaybePromise<UserNotification>;
  markRead(
    userId: string,
    notificationIds: string[] | undefined,
    now: string
  ): MaybePromise<UserNotification[]>;
  clear(): MaybePromise<void>;
}

function emptyStoreFile(): UserNotificationStoreFile {
  return {
    version: 1,
    notifications: [],
  };
}

function cloneNotification(notification: UserNotification): UserNotification {
  return UserNotificationSchema.parse(JSON.parse(JSON.stringify(notification)));
}

function sortNotifications(notifications: UserNotification[]) {
  return [...notifications].sort(
    (a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      b.id.localeCompare(a.id)
  );
}

function normalizeNotifications(notifications: unknown[]) {
  const byId = new Map<string, UserNotification>();
  for (const item of notifications) {
    const parsed = UserNotificationSchema.safeParse(item);
    if (parsed.success) byId.set(parsed.data.id, parsed.data);
  }
  return sortNotifications(Array.from(byId.values()));
}

function normalizeStoreFile(payload: unknown): UserNotificationStoreFile {
  const parsed = UserNotificationStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyStoreFile();

  return {
    version: 1,
    notifications: normalizeNotifications(parsed.data.notifications),
  };
}

export class InMemoryUserNotificationStore implements UserNotificationStore {
  private notifications: UserNotification[] = [];

  listByUserId(userId: string): UserNotification[] {
    return sortNotifications(
      this.notifications.filter(notification => notification.userId === userId)
    ).map(cloneNotification);
  }

  append(notification: UserNotification): UserNotification {
    const normalized = cloneNotification(notification);
    this.notifications = sortNotifications([
      normalized,
      ...this.notifications.filter(item => item.id !== normalized.id),
    ]);
    return cloneNotification(normalized);
  }

  markRead(
    userId: string,
    notificationIds: string[] | undefined,
    now: string
  ): UserNotification[] {
    const idSet = notificationIds ? new Set(notificationIds) : undefined;
    this.notifications = sortNotifications(
      this.notifications.map(notification => {
        if (notification.userId !== userId) return notification;
        if (idSet && !idSet.has(notification.id)) return notification;
        if (notification.status === "read") return notification;
        return UserNotificationSchema.parse({
          ...notification,
          status: "read",
          readAt: now,
        });
      })
    );
    return this.listByUserId(userId);
  }

  clear(): void {
    this.notifications = [];
  }
}

export class JsonFileUserNotificationStore implements UserNotificationStore {
  constructor(private readonly filePath = resolveUserNotificationStorePath()) {}

  listByUserId(userId: string): UserNotification[] {
    return this.readFile()
      .notifications.filter(notification => notification.userId === userId)
      .map(cloneNotification);
  }

  append(notification: UserNotification): UserNotification {
    const normalized = cloneNotification(notification);
    const file = this.readFile();
    this.writeFile({
      ...file,
      notifications: sortNotifications([
        normalized,
        ...file.notifications.filter(item => item.id !== normalized.id),
      ]),
    });
    return cloneNotification(normalized);
  }

  markRead(
    userId: string,
    notificationIds: string[] | undefined,
    now: string
  ): UserNotification[] {
    const idSet = notificationIds ? new Set(notificationIds) : undefined;
    const file = this.readFile();
    this.writeFile({
      ...file,
      notifications: sortNotifications(
        file.notifications.map(notification => {
          if (notification.userId !== userId) return notification;
          if (idSet && !idSet.has(notification.id)) return notification;
          if (notification.status === "read") return notification;
          return UserNotificationSchema.parse({
            ...notification,
            status: "read",
            readAt: now,
          });
        })
      ),
    });
    return this.listByUserId(userId);
  }

  clear(): void {
    this.writeFile(emptyStoreFile());
  }

  private readFile(): UserNotificationStoreFile {
    if (!fs.existsSync(this.filePath)) return emptyStoreFile();

    try {
      return normalizeStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf-8"))
      );
    } catch {
      return emptyStoreFile();
    }
  }

  private writeFile(file: UserNotificationStoreFile) {
    const normalized = normalizeStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf-8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

export function resolveUserNotificationStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_USER_NOTIFICATION_FILE ??
      ".hongboshi-data/user-notifications.json"
  );
}

export function createDefaultUserNotificationStore(): UserNotificationStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_USER_NOTIFICATION_STORE === "memory"
  ) {
    return new InMemoryUserNotificationStore();
  }

  return new JsonFileUserNotificationStore();
}

let userNotificationStore: UserNotificationStore =
  createDefaultUserNotificationStore();

export function getUserNotificationStore() {
  return userNotificationStore;
}

export function setUserNotificationStore(store: UserNotificationStore) {
  userNotificationStore = store;
}
