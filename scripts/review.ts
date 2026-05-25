import "dotenv/config";
import { createDeathmatchReview } from "../src/autoReview.js";
import { loadMetaConfig, requireAdSetConfig, requireSlackWebhookUrl } from "../src/config.js";
import { currentDeathmatchCycle, latestDeathmatchCycle } from "../src/dateRange.js";
import { MetaReadOnlyClient } from "../src/metaClient.js";
import { renderDeathmatchReport } from "../src/report.js";
import { renderSlackPayload, sendSlackWebhook } from "../src/slack.js";
import type { TimeRange } from "../src/types.js";

const args = new Set(process.argv.slice(2));
const slack = args.has("--slack");
const dryRun = args.has("--dry-run");
const scheduled = args.has("--scheduled");
const since = valueArg("--since");
const until = valueArg("--until");

if ((since && !until) || (!since && until)) {
  throw new Error("--since and --until must be provided together.");
}

const config = loadMetaConfig();
const adSetConfig = requireAdSetConfig(config);
const client = new MetaReadOnlyClient(config.accessToken, config.graphVersion);
const timeRange: TimeRange = since && until ? { since, until } : scheduled ? latestDeathmatchCycle() : currentDeathmatchCycle();
const review = await createDeathmatchReview(client, {
  ...adSetConfig,
  timeRange
});

if (slack) {
  const payload = renderSlackPayload(review);
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    await sendSlackWebhook(requireSlackWebhookUrl(config), payload);
    console.log("Slack 전송 완료");
  }
} else {
  console.log(renderDeathmatchReport(review));
}

function valueArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}
