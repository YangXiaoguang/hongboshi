import { describe, expect, it } from "vitest";
import {
  adminCredentialAccountToProfile,
  createDefaultAdminCredentialStore,
  createScryptPasswordHash,
  isDevAdminLoginEnabled,
  StaticAdminCredentialStore,
} from "./adminCredentialStore";

describe("development admin credential store", () => {
  it("enables dev admin login outside production unless explicitly disabled", () => {
    expect(
      isDevAdminLoginEnabled({
        NODE_ENV: "development",
        HONGBOSHI_ENABLE_DEV_ADMIN_LOGIN: undefined,
      })
    ).toBe(true);
    expect(
      isDevAdminLoginEnabled({
        NODE_ENV: "production",
        HONGBOSHI_ENABLE_DEV_ADMIN_LOGIN: undefined,
      })
    ).toBe(false);
    expect(
      isDevAdminLoginEnabled({
        NODE_ENV: "production",
        HONGBOSHI_ENABLE_DEV_ADMIN_LOGIN: "true",
      })
    ).toBe(true);
  });

  it("authenticates hashed admin credentials and maps them to backoffice users", async () => {
    const store = new StaticAdminCredentialStore([
      {
        id: "admin_dev_operator",
        username: "operator@hongboshi.dev",
        displayName: "开发运营",
        roles: ["operator"],
        passwordHash: createScryptPasswordHash("Operator@2026", "operator"),
        enabled: true,
      },
    ]);

    await expect(
      store.authenticate("OPERATOR@HONGBOSHI.DEV", "Operator@2026")
    ).resolves.toMatchObject({
      id: "admin_dev_operator",
      roles: ["operator"],
    });
    await expect(
      store.authenticate("operator@hongboshi.dev", "wrong-password")
    ).resolves.toBeNull();

    const account = await store.authenticate(
      "operator@hongboshi.dev",
      "Operator@2026"
    );
    expect(account).toBeTruthy();
    if (!account) return;
    expect(
      adminCredentialAccountToProfile(account, "2026-05-21T10:00:00.000Z")
    ).toMatchObject({
      id: "admin_dev_operator",
      roles: ["operator"],
      isMinor: false,
    });
  });

  it("loads environment configured accounts instead of default accounts", async () => {
    const store = createDefaultAdminCredentialStore({
      NODE_ENV: "development",
      HONGBOSHI_ENABLE_DEV_ADMIN_LOGIN: "true",
      HONGBOSHI_DEV_ADMIN_ACCOUNTS: JSON.stringify([
        {
          id: "admin_dev_catalog",
          username: "catalog@hongboshi.dev",
          displayName: "课程运营",
          roles: ["catalog_operator"],
          password: "Catalog@2026",
        },
      ]),
    } as NodeJS.ProcessEnv);

    await expect(
      store.authenticate("catalog@hongboshi.dev", "Catalog@2026")
    ).resolves.toMatchObject({
      id: "admin_dev_catalog",
      roles: ["catalog_operator"],
    });
    await expect(
      store.authenticate("admin@hongboshi.dev", "Admin@2026")
    ).resolves.toBeNull();
  });
});
