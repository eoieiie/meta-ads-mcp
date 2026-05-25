#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadMetaConfig, requireAdSetConfig, requireSlackWebhookUrl } from "./config.js";
import { MetaReadOnlyClient } from "./metaClient.js";
import { renderDeathmatchReport } from "./report.js";
import { calculateDeathmatchScore } from "./scoring.js";
import { latestDeathmatchCycle } from "./dateRange.js";
import { createDeathmatchReview } from "./autoReview.js";
import { renderSlackPayload, sendSlackWebhook } from "./slack.js";

const metricSchema = {
  name: z.string().min(1),
  spendKrw: z.number().nonnegative(),
  impressions: z.number().int().nonnegative(),
  reach: z.number().int().nonnegative(),
  instagramProfileVisits: z.number().int().nonnegative(),
  saves: z.number().int().nonnegative().optional(),
  likes: z.number().int().nonnegative().optional()
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
      "Generate the deathmatch report and send it to Slack via incoming webhook. Meta API remains read-only; only Slack receives a message.",
    inputSchema: {
      since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dryRun: z.boolean().optional()
    }
  },
  async ({ since, until, dryRun }) => {
    const config = loadMetaConfig();
    const adSetConfig = requireAdSetConfig(config);
    const client = new MetaReadOnlyClient(config.accessToken, config.graphVersion);
    const timeRange = since && until ? { since, until } : latestDeathmatchCycle();
    const review = await createDeathmatchReview(client, { ...adSetConfig, timeRange });
    const payload = renderSlackPayload(review);

    if (!dryRun) {
      await sendSlackWebhook(requireSlackWebhookUrl(config), payload);
    }

    return {
      content: [
        {
          type: "text",
          text: dryRun ? JSON.stringify(payload, null, 2) : `Slack 전송 완료\n\n${renderDeathmatchReport(review)}`
        }
      ],
      structuredContent: { sent: !dryRun, payload, review }
    };
  }
);

server.registerTool(
  "auto_review_latest_card_news",
  {
    title: "Auto-review latest deathmatch ads",
    description:
      "Automatically find active champion/challenger ads from the configured ad set, use the latest completed Sat-Fri deathmatch cycle unless dates are supplied, and return a deathmatch report.",
    inputSchema: {
      since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    }
  },
  async ({ since, until }) => {
    const config = loadMetaConfig();
    const adSetConfig = requireAdSetConfig(config);
    const client = new MetaReadOnlyClient(config.accessToken, config.graphVersion);
    const timeRange = since && until ? { since, until } : latestDeathmatchCycle();
    const review = await createDeathmatchReview(client, { ...adSetConfig, timeRange });

    return {
      content: [{ type: "text", text: renderDeathmatchReport(review) }],
      structuredContent: review
    };
  }
);

server.registerTool(
  "review_deathmatch_metrics",
  {
    title: "Review deathmatch metrics",
    description: "Compare champion and challenger ad metrics and return a deathmatch score. This tool never changes Meta ads.",
    inputSchema: {
      champion: z.object(metricSchema),
      challenger: z.object(metricSchema)
    }
  },
  async ({ champion, challenger }) => {
    const toAdInsightsMetrics = (m: typeof champion) => ({
      spendKrw: m.spendKrw,
      impressions: m.impressions,
      reach: m.reach,
      instagramProfileVisits: m.instagramProfileVisits,
      saves: m.saves ?? 0,
      likes: m.likes ?? 0,
      shares: 0,
      actions: [] as Array<{ action_type: string; value: string }>,
      raw: null
    });

    const score = calculateDeathmatchScore(toAdInsightsMetrics(champion), toAdInsightsMetrics(challenger));
    const text = `[Deathmatch Score]\nChampion: ${champion.name} vs Challenger: ${challenger.name}\n\n${JSON.stringify(score, null, 2)}`;

    return {
      content: [{ type: "text", text }],
      structuredContent: score
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
