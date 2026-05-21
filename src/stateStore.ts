import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { MediaDeltaSnapshot, MediaInsightsMetrics, MediaLifetimeSnapshot, ReviewState } from "./types.js";

export const DEFAULT_STATE_PATH = "data/state.json";

export async function loadReviewState(path = DEFAULT_STATE_PATH): Promise<ReviewState> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<ReviewState>;
    return {
      version: 1,
      media: parsed.media ?? {}
    };
  } catch (error) {
    if (isNotFound(error)) {
      return { version: 1, media: {} };
    }
    throw error;
  }
}

export async function saveReviewState(state: ReviewState, path = DEFAULT_STATE_PATH): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function createDeltaSnapshot(
  mediaId: string,
  insights: MediaInsightsMetrics,
  previous: MediaLifetimeSnapshot | undefined,
  capturedAt = new Date().toISOString()
): MediaDeltaSnapshot {
  const current: MediaLifetimeSnapshot = {
    mediaId,
    capturedAt,
    profileVisits: insights.profileVisits ?? 0,
    follows: insights.follows ?? 0,
    reach: insights.reach ?? 0,
    views: insights.views ?? 0
  };

  return {
    ...current,
    previous,
    deltaProfileVisits: previous ? Math.max(0, current.profileVisits - previous.profileVisits) : current.profileVisits,
    deltaFollows: previous ? Math.max(0, current.follows - previous.follows) : current.follows,
    usedLifetimeFallback: previous === undefined
  };
}

export function upsertMediaSnapshot(state: ReviewState, snapshot: MediaLifetimeSnapshot): ReviewState {
  const lifetimeSnapshot: MediaLifetimeSnapshot = {
    mediaId: snapshot.mediaId,
    capturedAt: snapshot.capturedAt,
    profileVisits: snapshot.profileVisits,
    follows: snapshot.follows,
    reach: snapshot.reach,
    views: snapshot.views
  };

  return {
    version: 1,
    media: {
      ...state.media,
      [snapshot.mediaId]: lifetimeSnapshot
    }
  };
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
