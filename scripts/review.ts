import "dotenv/config";
import { createAutoCardNewsReview } from "../src/autoReview.js";
import { loadMetaConfig, requireAutoReviewConfig, requireSlackWebhookUrl } from "../src/config.js";
import { currentThursdayToToday, latestCompletedThursdayToSunday } from "../src/dateRange.js";
import { MetaReadOnlyClient } from "../src/metaClient.js";
import { renderAutoCardNewsReview } from "../src/report.js";
import { renderSlackPayload, sendSlackWebhook } from "../src/slack.js";
import type { TimeRange } from "../src/types.js";

const args = new Set(process.argv.slice(2));
const slack = args.has("--slack");
const dryRun = args.has("--dry-run");
const noState = args.has("--no-state");
const scheduled = args.has("--scheduled");
const since = valueArg("--since");
const until = valueArg("--until");

if ((since && !until) || (!since && until)) {
  throw new Error("--since and --until must be provided together.");
}

const config = loadMetaConfig();
const autoConfig = requireAutoReviewConfig(config);
const client = new MetaReadOnlyClient(config.accessToken, config.graphVersion);
const timeRange: TimeRange = since && until ? { since, until } : scheduled ? latestCompletedThursdayToSunday() : currentThursdayToToday();
const autoReview = await createAutoCardNewsReview(client, {
  ...autoConfig,
  timeRange,
  updateState: !noState && !dryRun
});

if (slack) {
  const payload = renderSlackPayload(autoReview);
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    await sendSlackWebhook(requireSlackWebhookUrl(config), payload);
    console.log("Slack 전송 완료");
  }
} else {
  console.log(renderAutoCardNewsReview(autoReview));
}

function valueArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}
