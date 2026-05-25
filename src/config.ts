import "dotenv/config";

export type MetaConfig = {
  accessToken: string;
  graphVersion: string;
  adAccountId?: string;
  adSetId?: string;
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
    adSetId: env.META_ADSET_ID,
    slackWebhookUrl: env.SLACK_WEBHOOK_URL
  };
}

export function requireSlackWebhookUrl(config: MetaConfig): string {
  if (!config.slackWebhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL is required unless dryRun is true.");
  }
  return config.slackWebhookUrl;
}

export function requireAdSetConfig(config: MetaConfig): Required<Pick<MetaConfig, "adAccountId" | "adSetId">> {
  if (!config.adAccountId) {
    throw new Error("META_AD_ACCOUNT_ID is required for automatic review.");
  }
  if (!config.adSetId) {
    throw new Error("META_ADSET_ID is required for automatic review.");
  }

  return {
    adAccountId: config.adAccountId,
    adSetId: config.adSetId
  };
}
