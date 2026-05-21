# Meta Ads Read-only MCP

Read-only MCP server for reviewing Meta Ads card-news performance. It reads Meta metrics, calculates a follower-growth score, and returns manual recommendations only.

It never creates, pauses, deletes, updates, or changes budgets for Meta ads.

## Scope

- First target: Instagram feed card-news posts.
- Recommendation only: no Meta write actions.
- Current score: `(profileVisits + follows * 12) / spendKrw * 1000`.
- Strong manual replacement recommendation:
  - `profileVisits >= 80`
  - `follows / profileVisits >= 10%`
  - `candidateScore >= bestScore * 1.10`

## Tools

- `review_card_news_metrics`: calculate a report from manually supplied metrics.
- `fetch_meta_readonly_snapshot`: fetch read-only ad/media insights with GET requests.
- `review_meta_card_news`: fetch best/new ad metrics and return a manual recommendation.
- `auto_review_latest_card_news`: find active ads from configured best/new ad sets and return the latest Thu-Sun report.
- `send_auto_review_to_slack`: generate the automatic report and send it to Slack, or return the Slack payload with `dryRun`.

## Meta Metrics

The implementation requests these read-only fields:

- Ad insights: `spend`, `instagram_profile_visits`, `actions`, `cost_per_action_type`
- Instagram media insights: `profile_visits`, `follows`, `reach`, `views`

For feed posts, `profile_visits` and `follows` are expected to be the primary metrics. Reels may not expose the same follow/profile-visit metrics consistently, so reels should be validated separately before using the same score.

## Setup

```bash
npm install
npm run build
npm run sample
```

For Meta API tools, set:

```bash
META_ACCESS_TOKEN=...
META_GRAPH_VERSION=v25.0
META_AD_ACCOUNT_ID=act_1596117035020929
META_BEST_ADSET_ID=120244780378290101
META_NEW_ADSET_ID=120242637786920101
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Use a token with read permissions only where possible, such as `ads_read` and Instagram insights permissions. Do not grant write permissions unless you need them outside this MCP.

## Automatic Review

`auto_review_latest_card_news` uses the configured ad account and ad sets to:

1. Read active ads from the best and new ad sets.
2. Read each ad creative's `source_instagram_media_id`.
3. Read ad spend/profile visits from Ads Insights.
4. Read follows from Instagram Media Insights.
5. Store media lifetime snapshots in `data/state.json`.
6. Compare the two ads for the most recently completed Thursday-Sunday window unless `since` and `until` are supplied.

The tool only reads data and returns a recommendation. It does not change budgets, statuses, ads, ad sets, campaigns, or posts.

Note: Ads Insights exposes spend and Instagram profile visits for the selected date range. Instagram Media Insights exposes `follows` as a media lifetime metric. This server calculates weekly follow growth from the difference between the current lifetime value and the previous local snapshot. If there is no previous snapshot, it uses the lifetime value and clearly labels that fallback in the report.

## Slack

`send_auto_review_to_slack` posts the automatic report to `SLACK_WEBHOOK_URL`. Use `dryRun: true` first to inspect the payload without sending a Slack message. This does not write to Meta; it only reads Meta data and optionally sends one Slack webhook request.

## CLI

Use these commands for local manual checks:

```bash
npm run review
npm run review:dry-run
npm run review:slack
```

Optional date range:

```bash
node build/scripts/review.js --since 2026-05-21 --until 2026-05-24
node build/scripts/review.js --slack --since 2026-05-21 --until 2026-05-24
```

By default, the CLI uses the most recently completed Thursday-Sunday window and updates `data/state.json` unless `--dry-run` or `--no-state` is used.

## GitHub Actions

`.github/workflows/meta-ads-report.yml` sends the Slack report every Monday morning Korea time and also supports manual `Run workflow` execution from GitHub mobile or desktop.

Use a private repository. Add these repository secrets:

```text
META_ACCESS_TOKEN
META_AD_ACCOUNT_ID
META_BEST_ADSET_ID
META_NEW_ADSET_ID
SLACK_WEBHOOK_URL
```

Optional repository variable:

```text
META_GRAPH_VERSION=v25.0
```

After each non-dry-run execution, the workflow commits `data/state.json` back to the private repository so the next run can calculate weekly deltas.

## MCP Command

```bash
node build/src/index.js
```

## Manual QA

Sample report:

```bash
npm run sample
```

Tests:

```bash
npm test
```
