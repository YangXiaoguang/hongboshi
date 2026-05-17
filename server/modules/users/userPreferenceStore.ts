import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  UserPreferenceSchema,
  createEmptyUserPreference,
  normalizeUserPreference,
  type UserPreference,
} from "../../../shared/domain";

type MaybePromise<T> = T | Promise<T>;

const UserPreferenceStoreFileSchema = z.object({
  version: z.literal(1),
  preferences: z.array(UserPreferenceSchema).default([]),
});

type UserPreferenceStoreFile = z.infer<typeof UserPreferenceStoreFileSchema>;

export interface UserPreferenceStore {
  getByUserId(userId: string): MaybePromise<UserPreference | undefined>;
  save(preference: UserPreference): MaybePromise<UserPreference>;
  reset(preference?: UserPreference): MaybePromise<void>;
  clear(): MaybePromise<void>;
}

function emptyStoreFile(): UserPreferenceStoreFile {
  return {
    version: 1,
    preferences: [],
  };
}

function clonePreference(preference: UserPreference): UserPreference {
  return UserPreferenceSchema.parse(JSON.parse(JSON.stringify(preference)));
}

function normalizePreferences(preferences: unknown[]): UserPreference[] {
  return preferences
    .map(normalizeUserPreference)
    .filter((preference): preference is UserPreference => Boolean(preference))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function normalizeStoreFile(payload: unknown): UserPreferenceStoreFile {
  const parsed = UserPreferenceStoreFileSchema.safeParse(payload);
  if (!parsed.success) return emptyStoreFile();

  return {
    version: 1,
    preferences: normalizePreferences(parsed.data.preferences),
  };
}

export class InMemoryUserPreferenceStore implements UserPreferenceStore {
  private preferences = new Map<string, UserPreference>();

  getByUserId(userId: string): UserPreference | undefined {
    const preference = this.preferences.get(userId);
    return preference ? clonePreference(preference) : undefined;
  }

  save(preference: UserPreference): UserPreference {
    const normalized = UserPreferenceSchema.parse(preference);
    this.preferences.set(normalized.userId, clonePreference(normalized));
    return clonePreference(normalized);
  }

  reset(preference?: UserPreference): void {
    this.preferences.clear();
    if (preference) this.save(preference);
  }

  clear(): void {
    this.preferences.clear();
  }
}

export class JsonFileUserPreferenceStore implements UserPreferenceStore {
  constructor(private readonly filePath = resolveUserPreferenceStorePath()) {}

  getByUserId(userId: string): UserPreference | undefined {
    const preference = this.readFile().preferences.find(
      item => item.userId === userId
    );
    return preference ? clonePreference(preference) : undefined;
  }

  save(preference: UserPreference): UserPreference {
    const normalized = UserPreferenceSchema.parse(preference);
    const file = this.readFile();
    file.preferences = [
      normalized,
      ...file.preferences.filter(item => item.userId !== normalized.userId),
    ];
    this.writeFile(file);
    return clonePreference(normalized);
  }

  reset(preference?: UserPreference): void {
    this.writeFile({
      version: 1,
      preferences: preference ? [UserPreferenceSchema.parse(preference)] : [],
    });
  }

  clear(): void {
    this.writeFile(emptyStoreFile());
  }

  private readFile(): UserPreferenceStoreFile {
    if (!fs.existsSync(this.filePath)) return emptyStoreFile();

    try {
      return normalizeStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8"))
      );
    } catch {
      return emptyStoreFile();
    }
  }

  private writeFile(file: UserPreferenceStoreFile) {
    const normalized = normalizeStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

export function resolveUserPreferenceStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_USER_PREFERENCE_FILE ??
      ".hongboshi-data/user-preferences.json"
  );
}

export function createDefaultUserPreferenceStore(): UserPreferenceStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_USER_PREFERENCE_STORE === "memory"
  ) {
    return new InMemoryUserPreferenceStore();
  }

  return new JsonFileUserPreferenceStore();
}

export function emptyUserPreferenceFor(userId: string, now?: string) {
  return createEmptyUserPreference({ userId, now });
}
