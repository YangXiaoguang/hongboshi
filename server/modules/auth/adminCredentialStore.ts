import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { z } from "zod";
import {
  UserProfileSchema,
  UserRoleSchema,
  type UserProfile,
  type UserRole,
} from "../../../shared/domain";

export interface AdminCredentialAccount {
  id: string;
  username: string;
  displayName: string;
  roles: UserRole[];
  passwordHash: string;
  enabled: boolean;
}

export interface AdminCredentialStore {
  isEnabled(): boolean;
  authenticate(
    username: string,
    password: string
  ): Promise<AdminCredentialAccount | null> | AdminCredentialAccount | null;
}

const AdminCredentialAccountConfigSchema = z
  .object({
    id: z.string().trim().min(3).max(80),
    username: z.string().trim().toLowerCase().min(3).max(120),
    displayName: z.string().trim().min(1).max(40),
    roles: z.array(UserRoleSchema).min(1),
    passwordHash: z.string().trim().min(20).optional(),
    password: z.string().min(8).max(200).optional(),
    enabled: z.boolean().default(true),
  })
  .superRefine((account, ctx) => {
    if (!account.passwordHash && !account.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passwordHash"],
        message: "admin credential requires passwordHash or password",
      });
    }
  });

const DEFAULT_DEV_ADMIN_ACCOUNTS = [
  {
    id: "admin_dev_admin",
    username: "admin@hongboshi.dev",
    displayName: "开发管理员",
    roles: ["admin"],
    passwordHash:
      "scrypt:hongboshi-dev-admin:b6ff812f12886d8bccca09b914c498248ab3f21863cf78912f3ade2a002cab4c75aa68be651c2b632f3868f8eb370d227f5a63677a8c095238915ccba38cd62b",
    enabled: true,
  },
  {
    id: "admin_dev_operator",
    username: "operator@hongboshi.dev",
    displayName: "开发运营",
    roles: ["operator"],
    passwordHash:
      "scrypt:hongboshi-dev-operator:8adc68db96e0aa43e5bd5db217897051063d22f8594cb46596d39ea15601d5f68e958b36918527e301277cb7f4c7cf48f0746d6d4ed18ab993b1ebf4295a4df6",
    enabled: true,
  },
  {
    id: "admin_dev_catalog",
    username: "catalog@hongboshi.dev",
    displayName: "开发课程运营",
    roles: ["catalog_operator"],
    passwordHash:
      "scrypt:hongboshi-dev-catalog:4e12e93c81ce39306507156cbacabe880f6d8bfc6d04096b42efb88d801b7dc1b3598c6ddf585292866bb4647bd1a87787c750aabea49cd8d6894e0c2be9d899",
    enabled: true,
  },
] satisfies AdminCredentialAccount[];

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function createScryptPasswordHash(
  password: string,
  salt = randomBytes(16).toString("hex")
) {
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyScryptPassword(password: string, passwordHash: string) {
  const [algorithm, salt, expectedHex] = passwordHash.split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function adminCredentialAccountToProfile(
  account: AdminCredentialAccount,
  now: string
): UserProfile {
  return UserProfileSchema.parse({
    id: account.id,
    displayName: account.displayName,
    roles: account.roles,
    isMinor: false,
    createdAt: now,
    updatedAt: now,
  });
}

export function isDevAdminLoginEnabled(env: Partial<NodeJS.ProcessEnv>) {
  const flag = env.HONGBOSHI_ENABLE_DEV_ADMIN_LOGIN?.trim().toLowerCase();
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return env.NODE_ENV !== "production";
}

function normalizeAccountConfig(input: unknown): AdminCredentialAccount | null {
  const parsed = AdminCredentialAccountConfigSchema.safeParse(input);
  if (!parsed.success) return null;
  const account = parsed.data;
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    roles: account.roles,
    passwordHash:
      account.passwordHash ?? createScryptPasswordHash(account.password!),
    enabled: account.enabled,
  };
}

function loadAccountsFromEnv(
  rawAccounts: string | undefined
): AdminCredentialAccount[] | null {
  if (!rawAccounts?.trim()) return null;
  try {
    const parsed = JSON.parse(rawAccounts);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeAccountConfig)
      .filter((account): account is AdminCredentialAccount => Boolean(account));
  } catch {
    return [];
  }
}

export class StaticAdminCredentialStore implements AdminCredentialStore {
  private readonly accountByUsername: Map<string, AdminCredentialAccount>;

  constructor(
    accounts: AdminCredentialAccount[],
    private readonly enabled = true
  ) {
    this.accountByUsername = new Map(
      accounts.map(account => [normalizeUsername(account.username), account])
    );
  }

  isEnabled() {
    return this.enabled;
  }

  async authenticate(username: string, password: string) {
    if (!this.enabled) return null;
    const account = this.accountByUsername.get(normalizeUsername(username));
    if (!account?.enabled) return null;
    return verifyScryptPassword(password, account.passwordHash) ? account : null;
  }
}

export function createDefaultAdminCredentialStore(
  env: NodeJS.ProcessEnv = process.env
): AdminCredentialStore {
  const enabled = isDevAdminLoginEnabled(env);
  const envAccounts = loadAccountsFromEnv(env.HONGBOSHI_DEV_ADMIN_ACCOUNTS);
  return new StaticAdminCredentialStore(
    envAccounts ?? DEFAULT_DEV_ADMIN_ACCOUNTS,
    enabled
  );
}
