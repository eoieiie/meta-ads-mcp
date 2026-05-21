import "dotenv/config";

export type MetaConfig = {
  accessToken: string;
  graphVersion: string;
  adAccountId?: string;
  bestAdSetId?: string;
  newAdSetId?: string;
  slackWebhookUrl?: string;
};

export function loadMetaConfig(env: NodeJS.ProcessEnv = process.env): MetaConfig {
  const accessToken = env.META_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN is required for Meta API tools.");
  }

  return {
    accessToken,
    graphVersion: env.META_GRAPH_VERSION ?? "v25.0",
    adAccountId: env.META_AD_ACCOUNT_ID,
    bestAdSetId: env.META_BEST_ADSET_ID,
    newAdSetId: env.META_NEW_ADSET_ID,
    slackWebhookUrl: env.SLACK_WEBHOOK_URL
  };
}

export function requireSlackWebhookUrl(config: MetaConfig): string {
  if (!config.slackWebhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL is required unless dryRun is true.");
  }
  return config.slackWebhookUrl;
}

export function requireAutoReviewConfig(config: MetaConfig): Required<Pick<MetaConfig, "adAccountId" | "bestAdSetId" | "newAdSetId">> {
  if (!config.adAccountId) {
    throw new Error("META_AD_ACCOUNT_ID is required for automatic review.");
  }
  if (!config.bestAdSetId) {
    throw new Error("META_BEST_ADSET_ID is required for automatic review.");
  }
  if (!config.newAdSetId) {
    throw new Error("META_NEW_ADSET_ID is required for automatic review.");
  }

  return {
    adAccountId: config.adAccountId,
    bestAdSetId: config.bestAdSetId,
    newAdSetId: config.newAdSetId
  };
}
