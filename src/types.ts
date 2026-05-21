export type TimeRange = {
  since: string;
  until: string;
};

export type CardNewsMetrics = {
  name: string;
  spendKrw: number;
  profileVisits: number;
  follows: number;
  saves?: number;
  shares?: number;
};

export type ScoredCardNews = CardNewsMetrics & {
  weightedValue: number;
  score: number;
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
  createdTime?: string;
  updatedTime?: string;
  creative?: MetaAdCreativeSummary;
};

export type AdInsightsMetrics = {
  dateStart?: string;
  dateStop?: string;
  spendKrw: number;
  instagramProfileVisits: number | null;
  saves: number;
  shares: number;
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
  bestLifecycle: ScoredCardNews;
  bestRecent: ScoredCardNews;
  candidateRecent: ScoredCardNews;
  dailyRows: Array<{
    date: string;
    best: AdInsightsMetrics;
    candidate: AdInsightsMetrics;
  }>;
  otherAds: ScoredCardNews[];
  bestSnapshot?: MediaDeltaSnapshot;
  candidateSnapshot?: MediaDeltaSnapshot;
  review: CardNewsReview;
};
