import { getDatabaseUrl } from "./postgres";

export type PersistenceMode = "memory" | "file" | "postgres";

export type PersistenceStoreSpec = {
  envName: string;
  label: string;
  fallbackMode: PersistenceMode;
  autoPostgresWithDatabaseUrl: boolean;
  supportedModes: readonly PersistenceMode[];
};

export type PersistenceStoreConfig = PersistenceStoreSpec & {
  rawValue: string | undefined;
  mode: string;
  usesPostgres: boolean;
};

export const persistenceStoreSpecs = [
  {
    envName: "HONGBOSHI_AUTH_SESSION_STORE",
    label: "登录会话",
    fallbackMode: "memory",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "postgres"],
  },
  {
    envName: "HONGBOSHI_COURSE_ACCESS_STORE",
    label: "课程权益",
    fallbackMode: "file",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "file", "postgres"],
  },
  {
    envName: "HONGBOSHI_COURSE_PRODUCT_STORE",
    label: "课程商品",
    fallbackMode: "file",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "file", "postgres"],
  },
  {
    envName: "HONGBOSHI_COURSE_PRODUCT_CONTENT_STORE",
    label: "课程商品详情内容",
    fallbackMode: "file",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "file", "postgres"],
  },
  {
    envName: "HONGBOSHI_RISK_EVENT_STORE",
    label: "风险事件",
    fallbackMode: "memory",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "postgres"],
  },
  {
    envName: "HONGBOSHI_RISK_REVIEW_STORE",
    label: "风险复核处理记录",
    fallbackMode: "file",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "file", "postgres"],
  },
  {
    envName: "HONGBOSHI_RISK_SOP_STORE",
    label: "风险 SOP 模板与升级队列",
    fallbackMode: "file",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "file", "postgres"],
  },
  {
    envName: "HONGBOSHI_ASSESSMENT_RESULT_STORE",
    label: "测评报告",
    fallbackMode: "memory",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "postgres"],
  },
  {
    envName: "HONGBOSHI_COUNSELING_APPOINTMENT_STORE",
    label: "咨询预约",
    fallbackMode: "memory",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "postgres"],
  },
  {
    envName: "HONGBOSHI_COUNSELING_OPERATION_STORE",
    label: "咨询运营配置与审计",
    fallbackMode: "memory",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "postgres"],
  },
  {
    envName: "HONGBOSHI_PAYMENT_WEBHOOK_STORE",
    label: "支付回调收据",
    fallbackMode: "memory",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "postgres"],
  },
  {
    envName: "HONGBOSHI_TRANSACTION_OPERATION_STORE",
    label: "交易操作工单与审计",
    fallbackMode: "file",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "file", "postgres"],
  },
  {
    envName: "HONGBOSHI_FINANCE_RULE_STORE",
    label: "财务账期与手续费规则",
    fallbackMode: "file",
    autoPostgresWithDatabaseUrl: false,
    supportedModes: ["memory", "file"],
  },
  {
    envName: "HONGBOSHI_AUDIT_ARCHIVE_STORE",
    label: "统一审计归档",
    fallbackMode: "memory",
    autoPostgresWithDatabaseUrl: true,
    supportedModes: ["memory", "postgres"],
  },
] as const satisfies readonly PersistenceStoreSpec[];

function normalizeRawMode(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

export function resolvePersistenceConfig(env = process.env) {
  const databaseUrl = getDatabaseUrl(env);
  const stores: PersistenceStoreConfig[] = persistenceStoreSpecs.map(spec => {
    const rawValue = normalizeRawMode(env[spec.envName]);
    const mode =
      rawValue ??
      (databaseUrl && spec.autoPostgresWithDatabaseUrl
        ? "postgres"
        : spec.fallbackMode);

    return {
      ...spec,
      rawValue,
      mode,
      usesPostgres: mode === "postgres",
    };
  });

  const issues = stores.flatMap(store => {
    const storeIssues: string[] = [];

    if (!store.supportedModes.includes(store.mode as PersistenceMode)) {
      storeIssues.push(
        `${store.envName}=${store.rawValue} 不受支持，可用值：${store.supportedModes.join(
          ", "
        )}`
      );
    }

    if (store.usesPostgres && !databaseUrl) {
      storeIssues.push(`${store.envName}=postgres 需要配置 DATABASE_URL`);
    }

    return storeIssues;
  });

  return {
    databaseUrl,
    stores,
    issues,
    usesPostgres: stores.some(store => store.usesPostgres),
  };
}

export function assertPersistenceConfig(env = process.env) {
  const config = resolvePersistenceConfig(env);
  if (config.issues.length > 0) {
    throw new Error(
      ["持久化配置不合法：", ...config.issues.map(issue => `- ${issue}`)].join(
        "\n"
      )
    );
  }

  return config;
}
