import {
  AssessmentResultSchema,
  type AssessmentResult,
} from "../../../shared/domain";
import { getDatabaseUrl, getSharedPostgresPool } from "../../db/postgres";
import { PostgresAssessmentResultStore } from "./postgresAssessmentResultStore";

type MaybePromise<T> = T | Promise<T>;

export interface AssessmentResultStore {
  save(
    userId: string,
    result: AssessmentResult
  ): MaybePromise<AssessmentResult>;
  latest(userId: string): MaybePromise<AssessmentResult | undefined>;
  listByUser(userId: string): MaybePromise<AssessmentResult[]>;
  clear(): MaybePromise<void>;
}

function cloneAssessmentResult(result: AssessmentResult): AssessmentResult {
  return AssessmentResultSchema.parse(JSON.parse(JSON.stringify(result)));
}

export class InMemoryAssessmentResultStore implements AssessmentResultStore {
  private results = new Map<string, AssessmentResult[]>();

  save(userId: string, result: AssessmentResult): AssessmentResult {
    const normalized = AssessmentResultSchema.parse(result);
    const nextResults = [
      cloneAssessmentResult(normalized),
      ...(this.results.get(userId) ?? []).map(cloneAssessmentResult),
    ];
    this.results.set(userId, nextResults);
    return cloneAssessmentResult(normalized);
  }

  latest(userId: string): AssessmentResult | undefined {
    const result = this.results.get(userId)?.[0];
    return result ? cloneAssessmentResult(result) : undefined;
  }

  listByUser(userId: string): AssessmentResult[] {
    return (this.results.get(userId) ?? []).map(cloneAssessmentResult);
  }

  clear() {
    this.results.clear();
  }
}

export function createDefaultAssessmentResultStore(): AssessmentResultStore {
  if (
    process.env.HONGBOSHI_ASSESSMENT_RESULT_STORE === "postgres" ||
    (process.env.HONGBOSHI_ASSESSMENT_RESULT_STORE !== "memory" &&
      getDatabaseUrl())
  ) {
    return new PostgresAssessmentResultStore(getSharedPostgresPool());
  }

  return new InMemoryAssessmentResultStore();
}
