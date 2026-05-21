#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadMetaConfig, requireAutoReviewConfig, requireSlackWebhookUrl } from "./config.js";
import { MetaReadOnlyClient } from "./metaClient.js";
import { renderAutoCardNewsReview, renderCardNewsReview } from "./report.js";
import { reviewCardNews } from "./scoring.js";
import { latestCompletedThursdayToSunday } from "./dateRange.js";
import { createAutoCardNewsReview } from "./autoReview.js";
import { renderSlackPayload, sendSlackWebhook } from "./slack.js";
import type { CardNewsMetrics } from "./types.js";

const metricsSchema = {
  name: z.string().min(1),
  spendKrw: z.number().nonnegative(),
  profileVisits: z.number().int().nonnegative(),
  follows: z.number().int().nonnegative().optional()
};

const server = new McpServer({
  name: "meta-ads-readonly-mcp",
  version: "0.1.0"
});

server.registerTool(
  "send_auto_review_to_slack",
  {
    title: "Send auto review to Slack",
    description:
      "Generate the automatic card-news report and send it to Slack via incoming webhook. Meta API remains read-only; only Slack receives a message.",
    inputSchema: {
      since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      updateState: z.boolean().optional(),
      dryRun: z.boolean().optional()
    }
  },
  async ({ since, until, updateState, dryRun }) => {
    const config = loadMetaConfig();
    const autoConfig = requireAutoReviewConfig(config);
    const client = new MetaReadOnlyClient(config.accessToken, config.graphVersion);
    const timeRange = since && until ? { since, until } : latestCompletedThursdayToSunday();
    const autoReview = await createAutoCardNewsReview(client, { ...autoConfig, timeRange, updateState });
    const payload = renderSlackPayload(autoReview);

    if (!dryRun) {
      await sendSlackWebhook(requireSlackWebhookUrl(config), payload);
    }

    return {
      content: [
        {
          type: "text",
          text: dryRun ? JSON.stringify(payload, null, 2) : `Slack 전송 완료\n\n${renderAutoCardNewsReview(autoReview)}`
        }
      ],
      structuredContent: { sent: !dryRun, payload, autoReview }
    };
  }
);

server.registerTool(
  "auto_review_latest_card_news",
  {
    title: "Auto-review latest card-news ads",
    description:
      "Automatically find active best/new ads from configured ad sets, use the latest completed Thu-Sun window unless dates are supplied, and return a read-only manual recommendation.",
    inputSchema: {
      since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      updateState: z.boolean().optional()
    }
  },
  async ({ since, until, updateState }) => {
    const config = loadMetaConfig();
    const autoConfig = requireAutoReviewConfig(config);
    const client = new MetaReadOnlyClient(config.accessToken, config.graphVersion);
    const timeRange = since && until ? { since, until } : latestCompletedThursdayToSunday();
    const autoReview = await createAutoCardNewsReview(client, { ...autoConfig, timeRange, updateState });

    return {
      content: [{ type: "text", text: renderAutoCardNewsReview(autoReview) }],
      structuredContent: autoReview
    };
  }
);

server.registerTool(
  "review_card_news_metrics",
  {
    title: "Review card-news metrics",
    description: "Compare best and new card-news metrics and return a read-only recommendation. This tool never changes Meta ads.",
    inputSchema: {
      best: z.object(metricsSchema),
      candidate: z.object(metricsSchema),
      minVisits: z.number().int().nonnegative().optional()
    }
  },
  async ({ best, candidate, minVisits }) => {
    const review = reviewCardNews(best, candidate, { minVisits });
    return {
      content: [{ type: "text", text: renderCardNewsReview(review) }],
      structuredContent: review
    };
  }
);

server.registerTool(
  "fetch_meta_readonly_snapshot",
  {
    title: "Fetch Meta read-only snapshot",
    description: "Fetch read-only ad insights and Instagram media insights. Uses GET requests only and never mutates Meta ads.",
    inputSchema: {
      adId: z.string().min(1),
      mediaId: z.string().min(1).optional(),
      since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    }
  },
  async ({ adId, mediaId, since, until }) => {
    const config = loadMetaConfig();
    const client = new MetaReadOnlyClient(config.accessToken, config.graphVersion);
    const adInsights = await client.getAdInsights(adId, { since, until });
    const mediaInsights = mediaId ? await client.getInstagramMediaInsights(mediaId) : null;
    const snapshot = { adInsights, mediaInsights };

    return {
      content: [{ type: "text", text: JSON.stringify(snapshot, null, 2) }],
      structuredContent: snapshot
    };
  }
);

server.registerTool(
  "review_meta_card_news",
  {
    title: "Review Meta card-news ads",
    description: "Fetch read-only Meta metrics for best/new ads, combine optional media follows, and return a manual recommendation only.",
    inputSchema: {
      bestName: z.string().min(1),
      bestAdId: z.string().min(1),
      bestMediaId: z.string().min(1).optional(),
      candidateName: z.string().min(1),
      candidateAdId: z.string().min(1),
      candidateMediaId: z.string().min(1).optional(),
      since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    }
  },
  async ({ bestName, bestAdId, bestMediaId, candidateName, candidateAdId, candidateMediaId, since, until }) => {
    const config = loadMetaConfig();
    const client = new MetaReadOnlyClient(config.accessToken, config.graphVersion);
    const best = await loadCardNewsMetrics(client, bestName, bestAdId, bestMediaId, since, until);
    const candidate = await loadCardNewsMetrics(client, candidateName, candidateAdId, candidateMediaId, since, until);
    const review = reviewCardNews(best, candidate);

    return {
      content: [{ type: "text", text: renderCardNewsReview(review) }],
      structuredContent: review
    };
  }
);

async function loadCardNewsMetrics(
  client: MetaReadOnlyClient,
  name: string,
  adId: string,
  mediaId: string | undefined,
  since: string,
  until: string
): Promise<CardNewsMetrics> {
  const ad = await client.getAdInsights(adId, { since, until });
  const media = mediaId ? await client.getInstagramMediaInsights(mediaId) : null;

  return {
    name,
    spendKrw: ad.spendKrw,
    profileVisits: ad.instagramProfileVisits ?? media?.profileVisits ?? 0,
    follows: media?.follows ?? 0
  };
}

const transport = new StdioServerTransport();
await server.connect(transport);
