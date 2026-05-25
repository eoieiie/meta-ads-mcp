export type TimeRange = {
  since: string;
  until: string;
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
  likes: number;
  impressions: number;
  reach: number;
  actions: Array<{ action_type: string; value: string }>;
  raw: unknown;
};

export type DeathmatchScore = {
  championCPPV: number;
  challengerCPPV: number;
  championSaveRate: number;
  challengerSaveRate: number;
  championFrequency: number;
  challengerFrequency: number;
  costScore: number;
  attrScore: number;
  penalty: number;
  challengerHS: number;
  championHS: number;
  winner: "champion" | "challenger";
};

export type DeathmatchReport = {
  timeRange: TimeRange;
  adSetId: string;
  championAd: MetaAdSummary;
  challengerAd: MetaAdSummary | null;
  championMetrics: AdInsightsMetrics;
  challengerMetrics: AdInsightsMetrics | null;
  score: DeathmatchScore | null;
  dailyRows: Array<{
    date: string;
    champion: AdInsightsMetrics;
    challenger: AdInsightsMetrics;
  }>;
};


