import type { AdInsightsMetrics, MetaAdSummary, TimeRange } from "./types.js";

export class MetaReadOnlyClient {
  private readonly baseUrl: string;

  constructor(
    private readonly accessToken: string,
    graphVersion = "v25.0"
  ) {
    this.baseUrl = `https://graph.facebook.com/${graphVersion}`;
  }

  async getAdInsights(adId: string, timeRange: TimeRange): Promise<AdInsightsMetrics> {
    const params = new URLSearchParams({
      fields: "spend,impressions,reach,instagram_profile_visits,actions",
      time_range: JSON.stringify(timeRange),
      access_token: this.accessToken
    });
    const data = await this.getJson<{ data?: Array<Record<string, unknown>> }>(`/${encodeURIComponent(adId)}/insights?${params}`);
    return parseInsightsRow(data.data?.[0] ?? {}, data);
  }

  async getAccountAdInsights(accountId: string, adId: string, timeRange: TimeRange): Promise<AdInsightsMetrics> {
    const params = new URLSearchParams({
      level: "ad",
      fields: "ad_id,spend,impressions,reach,instagram_profile_visits,actions",
      time_range: JSON.stringify(timeRange),
      filtering: JSON.stringify([{ field: "ad.id", operator: "IN", value: [adId] }]),
      access_token: this.accessToken
    });
    const data = await this.getJson<{ data?: Array<Record<string, unknown>> }>(`/${encodeURIComponent(accountId)}/insights?${params}`);
    return parseInsightsRow(data.data?.[0] ?? {}, data);
  }

  async getAccountAdDailyInsights(accountId: string, adId: string, timeRange: TimeRange): Promise<AdInsightsMetrics[]> {
    const params = new URLSearchParams({
      level: "ad",
      fields: "ad_id,ad_name,date_start,date_stop,spend,impressions,reach,instagram_profile_visits,actions",
      time_range: JSON.stringify(timeRange),
      time_increment: "1",
      filtering: JSON.stringify([{ field: "ad.id", operator: "IN", value: [adId] }]),
      access_token: this.accessToken
    });
    const data = await this.getJson<{ data?: Array<Record<string, unknown>> }>(`/${encodeURIComponent(accountId)}/insights?${params}`);
    return (data.data ?? []).map((row) => parseInsightsRow(row, row));
  }

  async listAdSetAds(adSetId: string): Promise<MetaAdSummary[]> {
    const params = new URLSearchParams({
      fields: [
        "id",
        "name",
        "status",
        "effective_status",
        "created_time",
        "updated_time",
        "creative{id,name,instagram_permalink_url,source_instagram_media_id}"
      ].join(","),
      limit: "100",
      access_token: this.accessToken
    });
    const data = await this.getJson<{ data?: unknown[] }>(`/${encodeURIComponent(adSetId)}/ads?${params}`);
    return (data.data ?? []).flatMap(parseAdSummary);
  }

  private async getJson<T>(pathAndQuery: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${pathAndQuery}`, { method: "GET" });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`Meta API GET failed (${response.status}): ${body}`);
    }

    return JSON.parse(body) as T;
  }
}

function parseAdSummary(value: unknown): MetaAdSummary[] {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return [];
  }

  const creative = isRecord(value.creative)
    ? {
        id: typeof value.creative.id === "string" ? value.creative.id : "",
        name: typeof value.creative.name === "string" ? value.creative.name : undefined,
        instagramPermalinkUrl:
          typeof value.creative.instagram_permalink_url === "string" ? value.creative.instagram_permalink_url : undefined,
        sourceInstagramMediaId:
          typeof value.creative.source_instagram_media_id === "string" ? value.creative.source_instagram_media_id : undefined
      }
    : undefined;

  return [
    {
      id: value.id,
      name: value.name,
      status: typeof value.status === "string" ? value.status : undefined,
      effectiveStatus: typeof value.effective_status === "string" ? value.effective_status : undefined,
      createdTime: typeof value.created_time === "string" ? value.created_time : undefined,
      updatedTime: typeof value.updated_time === "string" ? value.updated_time : undefined,
      creative
    }
  ];
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return parseNumber(value);
}

function parseActions(value: unknown[]): Array<{ action_type: string; value: string }> {
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.action_type !== "string") {
      return [];
    }
    return [{ action_type: item.action_type, value: String(item.value ?? "0") }];
  });
}

function parseInsightsRow(row: Record<string, unknown>, raw: unknown): AdInsightsMetrics {
  const actions = Array.isArray(row.actions) ? parseActions(row.actions) : [];
  return {
    dateStart: typeof row.date_start === "string" ? row.date_start : undefined,
    dateStop: typeof row.date_stop === "string" ? row.date_stop : undefined,
    spendKrw: parseNumber(row.spend),
    instagramProfileVisits: parseNullableNumber(row.instagram_profile_visits),
    saves: sumActions(actions, (actionType) => actionType.includes("save")),
    shares: sumActions(actions, (actionType) => actionType === "post" || actionType.includes("share")),
    likes: sumActions(actions, (actionType) => actionType === "post_reaction" || actionType === "like" || actionType.includes("reaction")),
    impressions: parseNumber(row.impressions),
    reach: parseNumber(row.reach),
    actions,
    raw
  };
}

function sumActions(actions: Array<{ action_type: string; value: string }>, predicate: (actionType: string) => boolean): number {
  return actions.reduce((sum, action) => sum + (predicate(action.action_type) ? parseNumber(action.value) : 0), 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
