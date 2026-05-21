import http from "http";
import { loadMetaConfig, requireAutoReviewConfig, requireSlackWebhookUrl } from "./config.js";
import { MetaReadOnlyClient } from "./metaClient.js";
import { createAutoCardNewsReview } from "./autoReview.js";
import { renderSlackPayload, sendSlackWebhook } from "./slack.js";
import { currentThursdayToToday } from "./dateRange.js";

async function runReport(): Promise<string> {
  const config = loadMetaConfig();
  const client = new MetaReadOnlyClient(config.accessToken, config.graphVersion);
  const autoConfig = requireAutoReviewConfig(config);
  const timeRange = currentThursdayToToday();
  const review = await createAutoCardNewsReview(client, { ...autoConfig, timeRange });
  await sendSlackWebhook(requireSlackWebhookUrl(config), renderSlackPayload(review));
  return "Slack 전송 완료";
}

function unauthorized(res: http.ServerResponse): void {
  res.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Unauthorized" }));
}

function ok(res: http.ServerResponse, data: unknown): void {
  res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(data));
}

function fail(res: http.ServerResponse, status: number, msg: string): void {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify({ error: msg }));
}

const server = http.createServer((req, res) => {
  const apiKey = process.env.API_KEY;
  if (apiKey && req.headers["x-api-key"] !== apiKey) {
    unauthorized(res);
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  // Health check
  if (url.pathname === "/" || url.pathname === "/health") {
    ok(res, { status: "ok" });
    return;
  }

  // Trigger report
  if (url.pathname === "/report" && (req.method === "GET" || req.method === "POST")) {
    runReport()
      .then((msg) => ok(res, { ok: true, message: msg }))
      .catch((err: Error) => fail(res, 500, err.message));
    return;
  }

  fail(res, 404, "Not found");
});

const PORT = parseInt(process.env.PORT || "3000", 10);
server.listen(PORT, () => {
  console.log(`Meta Ads report server listening on port ${PORT}`);
});
