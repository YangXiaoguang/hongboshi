import {
  CourseConversionEventBatchSchema,
  CourseConversionEventSchema,
  type CourseConversionEvent,
} from "@shared/domain";
import {
  createCourseConversionEvent,
  type CourseConversionEventDraft,
} from "../model/courseConversion";

export const COURSE_CONVERSION_STORAGE_KEY =
  "hongboshi.courseConversion.events.v1";
export const COURSE_CONVERSION_SESSION_KEY =
  "hongboshi.courseConversion.sessionId.v1";
const MAX_BUFFERED_EVENTS = 200;

export type CourseConversionStoredEventStatus = "queued" | "sent" | "failed";

export interface CourseConversionStoredEvent {
  event: CourseConversionEvent;
  status: CourseConversionStoredEventStatus;
  updatedAt: string;
  lastError?: string;
}

export interface CourseConversionAnalyticsRepository {
  track: (
    draft: CourseConversionEventDraft
  ) => Promise<CourseConversionEvent | undefined>;
  listBufferedEvents: () => CourseConversionStoredEvent[];
  clearBufferedEvents: () => void;
}

export interface CourseConversionAnalyticsRepositoryOptions {
  storage?: Storage;
  endpoint?: string;
  websiteId?: string;
  fetcher?: typeof fetch;
  now?: () => string;
  createId?: () => string;
  getPagePath?: () => string;
}

function getBrowserStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function getBrowserFetcher(): typeof fetch | undefined {
  if (typeof fetch === "undefined") return undefined;
  return fetch.bind(globalThis);
}

function createFallbackId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `${prefix}_${randomId}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeNow(now?: () => string): string {
  return now?.() ?? new Date().toISOString();
}

function safeRead(storage: Storage | undefined, key: string): string | null {
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(
  storage: Storage | undefined,
  key: string,
  value: string
): void {
  if (!storage) return;

  try {
    storage.setItem(key, value);
  } catch {
    // Analytics must never block checkout or learning flows.
  }
}

function safeRemove(storage: Storage | undefined, key: string): void {
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures for the same reason as safeWrite.
  }
}

function getOrCreateSessionId(
  storage: Storage | undefined,
  createId: () => string
): string {
  const existing = safeRead(storage, COURSE_CONVERSION_SESSION_KEY);
  if (existing) return existing;

  const sessionId = createId();
  safeWrite(storage, COURSE_CONVERSION_SESSION_KEY, sessionId);
  return sessionId;
}

function parseStoredEvents(raw: string | null): CourseConversionStoredEvent[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap(item => {
      const event = CourseConversionEventSchema.safeParse(item?.event);
      if (!event.success) return [];
      const status =
        item?.status === "sent" || item?.status === "failed"
          ? item.status
          : "queued";

      return [
        {
          event: event.data,
          status,
          updatedAt:
            typeof item?.updatedAt === "string"
              ? item.updatedAt
              : event.data.occurredAt,
          lastError:
            typeof item?.lastError === "string" ? item.lastError : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

function readStoredEvents(
  storage: Storage | undefined
): CourseConversionStoredEvent[] {
  return parseStoredEvents(safeRead(storage, COURSE_CONVERSION_STORAGE_KEY));
}

function writeStoredEvents(
  storage: Storage | undefined,
  events: CourseConversionStoredEvent[]
): void {
  safeWrite(
    storage,
    COURSE_CONVERSION_STORAGE_KEY,
    JSON.stringify(events.slice(-MAX_BUFFERED_EVENTS))
  );
}

function updateStoredEvent(
  storage: Storage | undefined,
  eventId: string,
  patch: Pick<CourseConversionStoredEvent, "status" | "updatedAt"> &
    Partial<Pick<CourseConversionStoredEvent, "lastError">>
): void {
  const events = readStoredEvents(storage).map(item =>
    item.event.id === eventId ? { ...item, ...patch } : item
  );
  writeStoredEvents(storage, events);
}

function defaultPagePath(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

function readViteEnv(key: string): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  const value = env[key]?.trim();
  return value ? value : undefined;
}

export function createCourseConversionAnalyticsRepository(
  options: CourseConversionAnalyticsRepositoryOptions = {}
): CourseConversionAnalyticsRepository {
  const storage = options.storage ?? getBrowserStorage();
  const endpoint = options.endpoint ?? readViteEnv("VITE_ANALYTICS_ENDPOINT");
  const websiteId =
    options.websiteId ?? readViteEnv("VITE_ANALYTICS_WEBSITE_ID");
  const fetcher = options.fetcher ?? getBrowserFetcher();
  const createId = options.createId ?? (() => createFallbackId("cc"));
  const createSessionId = () => createFallbackId("ccs");

  const listBufferedEvents = () => readStoredEvents(storage);

  return {
    async track(draft) {
      const event = createCourseConversionEvent(draft, {
        sessionId: getOrCreateSessionId(storage, createSessionId),
        websiteId,
        pagePath: options.getPagePath?.() ?? defaultPagePath(),
        now: options.now,
        createId,
      });
      const queuedAt = safeNow(options.now);

      writeStoredEvents(storage, [
        ...readStoredEvents(storage),
        {
          event,
          status: "queued",
          updatedAt: queuedAt,
        },
      ]);

      if (!endpoint || !fetcher) return event;

      try {
        const batch = CourseConversionEventBatchSchema.parse({
          websiteId: event.websiteId,
          events: [event],
        });
        const response = await fetcher(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(batch),
          keepalive: true,
        });

        if (!response.ok) {
          throw new Error(`ANALYTICS_HTTP_${response.status}`);
        }

        updateStoredEvent(storage, event.id, {
          status: "sent",
          updatedAt: safeNow(options.now),
        });
      } catch (err) {
        updateStoredEvent(storage, event.id, {
          status: "failed",
          updatedAt: safeNow(options.now),
          lastError:
            err instanceof Error ? err.message : "ANALYTICS_REQUEST_FAILED",
        });
      }

      return event;
    },
    listBufferedEvents,
    clearBufferedEvents() {
      safeRemove(storage, COURSE_CONVERSION_STORAGE_KEY);
    },
  };
}

const courseConversionAnalyticsRepository =
  createCourseConversionAnalyticsRepository();

export function trackCourseConversionEvent(
  draft: CourseConversionEventDraft
): Promise<CourseConversionEvent | undefined> {
  return courseConversionAnalyticsRepository
    .track(draft)
    .catch(() => undefined);
}
