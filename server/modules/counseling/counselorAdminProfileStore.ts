import fs from "fs";
import path from "path";
import { z } from "zod";
import { counselorProfiles } from "../../../shared/data/counselingSeed";
import {
  CounselorAdminProfileConfigSchema,
  type CounselorAdminProfileConfig,
} from "../../../shared/domain";

type MaybePromise<T> = T | Promise<T>;

const CounselorAdminProfileStoreFileSchema = z.object({
  version: z.literal(1),
  profiles: z.array(CounselorAdminProfileConfigSchema),
});

type CounselorAdminProfileStoreFile = z.infer<
  typeof CounselorAdminProfileStoreFileSchema
>;

export interface CounselorAdminProfileStore {
  listProfiles(now?: string): MaybePromise<CounselorAdminProfileConfig[]>;
  getProfile(
    counselorId: string,
    now?: string
  ): MaybePromise<CounselorAdminProfileConfig | undefined>;
  saveProfile(
    profile: CounselorAdminProfileConfig
  ): MaybePromise<CounselorAdminProfileConfig>;
  clear(): MaybePromise<void>;
}

function cloneProfile(
  profile: CounselorAdminProfileConfig
): CounselorAdminProfileConfig {
  return CounselorAdminProfileConfigSchema.parse(
    JSON.parse(JSON.stringify(profile))
  );
}

function buildDefaultProfile(
  counselor: (typeof counselorProfiles)[number],
  now = new Date().toISOString()
): CounselorAdminProfileConfig {
  return CounselorAdminProfileConfigSchema.parse({
    counselor,
    serviceStatus: "active",
    acceptsNewClients: true,
    credentialStatus: "verified",
    updatedAt: now,
  });
}

function buildDefaultProfiles(now = new Date().toISOString()) {
  return counselorProfiles.map(counselor =>
    buildDefaultProfile(counselor, now)
  );
}

function normalizeProfiles(
  profiles: unknown,
  now = new Date().toISOString()
): CounselorAdminProfileConfig[] {
  const parsed = z.array(CounselorAdminProfileConfigSchema).safeParse(profiles);
  const storedProfiles = parsed.success ? parsed.data : [];
  const storedById = new Map(
    storedProfiles.map(profile => [profile.counselor.id, profile])
  );

  return counselorProfiles.map(seed => {
    const stored = storedById.get(seed.id);
    if (!stored) return buildDefaultProfile(seed, now);

    return CounselorAdminProfileConfigSchema.parse({
      ...stored,
      counselor: {
        ...seed,
        ...stored.counselor,
        id: seed.id,
      },
    });
  });
}

function normalizeStoreFile(
  payload: unknown,
  now = new Date().toISOString()
): CounselorAdminProfileStoreFile {
  const parsed = CounselorAdminProfileStoreFileSchema.safeParse(payload);
  return {
    version: 1,
    profiles: normalizeProfiles(
      parsed.success ? parsed.data.profiles : [],
      now
    ),
  };
}

export class InMemoryCounselorAdminProfileStore implements CounselorAdminProfileStore {
  private profiles = buildDefaultProfiles();

  listProfiles(now = new Date().toISOString()): CounselorAdminProfileConfig[] {
    this.profiles = normalizeProfiles(this.profiles, now);
    return this.profiles.map(cloneProfile);
  }

  getProfile(
    counselorId: string,
    now = new Date().toISOString()
  ): CounselorAdminProfileConfig | undefined {
    return this.listProfiles(now).find(
      profile => profile.counselor.id === counselorId
    );
  }

  saveProfile(
    profile: CounselorAdminProfileConfig
  ): CounselorAdminProfileConfig {
    const normalized = CounselorAdminProfileConfigSchema.parse(profile);
    const nextProfiles = normalizeProfiles(this.profiles, normalized.updatedAt);
    const index = nextProfiles.findIndex(
      item => item.counselor.id === normalized.counselor.id
    );

    if (index === -1) {
      nextProfiles.push(normalized);
    } else {
      nextProfiles[index] = normalized;
    }

    this.profiles = normalizeProfiles(nextProfiles, normalized.updatedAt);
    return cloneProfile(normalized);
  }

  clear() {
    this.profiles = buildDefaultProfiles();
  }
}

export class JsonFileCounselorAdminProfileStore implements CounselorAdminProfileStore {
  constructor(
    private readonly filePath = resolveCounselorAdminProfileStorePath()
  ) {}

  listProfiles(now = new Date().toISOString()): CounselorAdminProfileConfig[] {
    return this.readFile(now).profiles.map(cloneProfile);
  }

  getProfile(
    counselorId: string,
    now = new Date().toISOString()
  ): CounselorAdminProfileConfig | undefined {
    return this.listProfiles(now).find(
      profile => profile.counselor.id === counselorId
    );
  }

  saveProfile(
    profile: CounselorAdminProfileConfig
  ): CounselorAdminProfileConfig {
    const normalized = CounselorAdminProfileConfigSchema.parse(profile);
    const profiles = this.listProfiles(normalized.updatedAt);
    const index = profiles.findIndex(
      item => item.counselor.id === normalized.counselor.id
    );

    if (index === -1) {
      profiles.push(normalized);
    } else {
      profiles[index] = normalized;
    }

    this.writeFile({
      version: 1,
      profiles,
    });
    return cloneProfile(normalized);
  }

  clear() {
    this.writeFile({
      version: 1,
      profiles: buildDefaultProfiles(),
    });
  }

  private readFile(now = new Date().toISOString()) {
    if (!fs.existsSync(this.filePath)) {
      return {
        version: 1,
        profiles: buildDefaultProfiles(now),
      } satisfies CounselorAdminProfileStoreFile;
    }

    try {
      return normalizeStoreFile(
        JSON.parse(fs.readFileSync(this.filePath, "utf8")),
        now
      );
    } catch {
      return {
        version: 1,
        profiles: buildDefaultProfiles(now),
      } satisfies CounselorAdminProfileStoreFile;
    }
  }

  private writeFile(file: CounselorAdminProfileStoreFile) {
    const normalized = normalizeStoreFile(file);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(normalized, null, 2), "utf8");
    fs.renameSync(tmpPath, this.filePath);
  }
}

export function resolveCounselorAdminProfileStorePath() {
  return path.resolve(
    process.cwd(),
    process.env.HONGBOSHI_COUNSELOR_PROFILE_FILE ??
      ".hongboshi-data/counselor-profiles.json"
  );
}

export function createDefaultCounselorAdminProfileStore(): CounselorAdminProfileStore {
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST ||
    process.env.HONGBOSHI_COUNSELOR_PROFILE_STORE === "memory"
  ) {
    return new InMemoryCounselorAdminProfileStore();
  }

  return new JsonFileCounselorAdminProfileStore();
}
