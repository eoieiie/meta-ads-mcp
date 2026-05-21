export type TimeRange = {
  since: string;
  until: string;
};

export type CardNewsMetrics = {
  name: string;
  spendKrw: number;
  profileVisits: number;
  follows: number;
};

export type ScoredCardNews = CardNewsMetrics & {
  conversionRate: number;
  costPerFollowKrw: number | null;
  valueScorePer1000Krw: number;
  sampleQualified: boolean;
};

export type RecommendationLevel = "strong_replace" | "observe" | "keep_best" | "insufficient_sample";

export type CardNewsReview = {
  best: ScoredCardNews;
  candidate: ScoredCardNews;
  recommendation: RecommendationLevel;
  summary: string;
  reasons: string[];
};

export type MetaAdCreativeSummary = {
  id: string;
  name?: string;
  instagramPermalinkUrl?: string;
  sourceInstagramMediaId?: string;
};

export type MetaAdSummary = {
  id: string;
  name: string;
  status?: string;
  effectiveStatus?: string;
  updatedTime?: string;
  creative?: MetaAdCreativeSummary;
};

export type AdInsightsMetrics = {
  spendKrw: number;
  instagramProfileVisits: number | null;
  actions: Array<{ action_type: string; value: string }>;
  raw: unknown;
};

export type MediaInsightsMetrics = {
  profileVisits: number | null;
  follows: number | null;
  reach: number | null;
  views: number | null;
  raw: unknown;
};

export type MediaLifetimeSnapshot = {
  mediaId: string;
  capturedAt: string;
  profileVisits: number;
  follows: number;
  reach: number;
  views: number;
};

export type MediaDeltaSnapshot = MediaLifetimeSnapshot & {
  previous?: MediaLifetimeSnapshot;
  deltaProfileVisits: number;
  deltaFollows: number;
  usedLifetimeFallback: boolean;
};

export type ReviewState = {
  version: 1;
  media: Record<string, MediaLifetimeSnapshot>;
};

export type AutoCardNewsReview = {
  timeRange: TimeRange;
  bestAd: MetaAdSummary;
  candidateAd: MetaAdSummary;
  bestSnapshot?: MediaDeltaSnapshot;
  candidateSnapshot?: MediaDeltaSnapshot;
  review: CardNewsReview;
};
