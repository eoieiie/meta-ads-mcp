# Meta Ads Deathmatch MCP

Read-only MCP server for comparing Instagram card-news ad performance using a **champion/challenger deathmatch** evaluation system.

Meta API is accessed read-only. This server never creates, pauses, deletes, or modifies any Meta ads.

---

## 🇰🇷 한국어

### 개요

Meta 광고 계정 내 **하나의 광고 세트(ad set)**에서 ACTIVE 상태인 광고 2개를 뽑아 챔피언(Champion)과 챌린저(Challenger)로 지정, 상대 평가 점수를 매기는 데스매치 시스템입니다.

- **챔피언**: 광고 세트 내에서 `created_time`이 가장 오래된 ACTIVE 광고
- **챌린저**: 광고 세트 내에서 `created_time`이 가장 최근인 ACTIVE 광고
- 하나의 광고만 ACTIVE면 단일 광고 리포트 (점수 없음)
- ACTIVE 광고가 0개면 에러

### 데스매치 점수 공식

| 항목 | 설명 | 최대 |
|---|---|---|
| **CostScore** | 방문 단가(CPPV) 상대 비교: `(챔피언CPPV / 챌린저CPPV) × 60` | 120점 |
| **AttrScore** | 저장률(SaveRate) 상대 비교: `(챌린저저장률 / 챔피언저장률) × 40` | 80점 |
| **Penalty** | 광고 빈도(Frequency) 2.0 초과 시 `(frequency - 2.0) × 10` 차감 | 제한 없음 |
| **Challenger HS** | `CostScore + AttrScore - Penalty` (최대 200점) | 200점 |
| **Champion HS** | 항상 **100점** 고정 (절대 기준) | 100점 |

**승자 판정**: Challenger HS > 100 → 챌린저 승리, 그 외 → 챔피언 유지

**Edge case 처리**:
- 양쪽 방문 0 → CostScore 60점 (중립)
- 챔피언 방문 0, 챌린저 방문 > 0 → CostScore 120점 (챌린저 최대)
- 챔피언 방문 > 0, 챌린저 방문 0 → CostScore 0점 (챌린저 최소)
- 챔피언 저장률 0% → AttrScore는 챌린저 저장 수에 따라 0점 또는 40점
- 도달(reach) 0 → 저장률·빈도 모두 0 처리

### 주간 운영 사이클

| 요일 | 작업 | 설명 |
|---|---|---|
| **수요일** | 새 게시글 업로드 (광고 OFF) | 인스타 피드에 업로드만, 오가닉 반응 관찰 |
| **목–금** | 대기실 | 순수 오가닉 데이터 수집 |
| **금요일 23:00 KST** | 🤖 자동 슬랙 리포트 | 지난 토~금 7일간 데스매치 결과 전송 |
| **토요일 아침** | 🥊 사람의 결단 | 패자 OFF, 새 도전자 ON |

사이클은 `토요일 ~ 금요일` 단위로 반복됩니다.

### 설정

```bash
# 필수
META_ACCESS_TOKEN=<read_only_token>
META_AD_ACCOUNT_ID=act_000000000000000
META_ADSET_ID=000000000000000000

# 선택
META_GRAPH_VERSION=v25.0
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### 사용법

```bash
# 설치
npm install
npm run build

# 샘플 점수 확인
npm run sample

# 수동 리포트 (터미널 출력)
npm run review

# 슬랙 전송 (dry-run으로 먼저 확인)
npm run review:dry-run
npm run review:slack

# 날짜 직접 지정
node build/scripts/review.js --since 2026-05-23 --until 2026-05-26
node build/scripts/review.js --slack --since 2026-05-23 --until 2026-05-26

# 지난주 완료된 주차 기준 (자동 실행과 동일)
node build/scripts/review.js --scheduled --slack
```

### MCP 서버

```bash
node build/src/index.js
```

등록된 도구:
- `send_auto_review_to_slack` — 데스매치 리포트 생성 + 슬랙 발송
- `auto_review_latest_card_news` — 데스매치 리포트 텍스트 출력
- `review_deathmatch_metrics` — 수동 메트릭 입력 → 점수 계산

### GitHub Actions (자동 실행)

`.github/workflows/meta-ads-report.yml`이 **매주 금요일 23:00 KST**에 자동 실행됩니다.

GitHub Secrets에 등록해야 할 값:
- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- `META_ADSET_ID`
- `SLACK_WEBHOOK_URL`

GitHub UI에서 `Actions → Meta Ads Report → Run workflow`로 수동 실행 가능합니다.

### 기술 스택

- TypeScript, Node.js 20+
- [Meta Graph API](https://developers.facebook.com/docs/graph-api) v25.0 (읽기 전용)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) (Model Context Protocol)
- Slack Incoming Webhook
- node:test (단위 테스트)

---

## 🇬🇧 English

### Overview

A read-only MCP server that evaluates Instagram card-news ad performance via a **champion/challenger deathmatch** system within a single Meta ad set.

- **Champion**: The oldest ACTIVE ad in the ad set (by `created_time`)
- **Challenger**: The newest ACTIVE ad in the ad set (by `created_time`)
- Single active ad → raw data report only (no scoring)
- Zero active ads → throws an error

### Deathmatch Scoring Formula

| Component | Description | Max |
|---|---|---|
| **CostScore** | Relative CPPV comparison: `(championCPPV / challengerCPPV) × 60` | 120 |
| **AttrScore** | Relative Save Rate comparison: `(challengerSaveRate / championSaveRate) × 40` | 80 |
| **Penalty** | Deducted when Frequency > 2.0: `(frequency - 2.0) × 10` | Unlimited |
| **Challenger HS** | `CostScore + AttrScore - Penalty` | 200 |
| **Champion HS** | Fixed at **100** (absolute baseline) | 100 |

**Winner**: Challenger HS > 100 → challenger wins. Otherwise → champion retains.

**Edge cases**:
- Both 0 visits → CostScore = 60 (neutral)
- Champion 0 visits, challenger > 0 → CostScore = 120 (max for challenger)
- Champion > 0 visits, challenger 0 → CostScore = 0 (min for challenger)
- Champion 0% save rate → AttrScore = 0 or 40 based on challenger saves
- Reach = 0 → both save rate and frequency set to 0

### Weekly Cycle

| Day | Action | Note |
|---|---|---|
| **Wednesday** | Upload new post (ad OFF) | Feed post only, observe organic response |
| **Thu–Fri** | Waiting room | Collect organic data |
| **Friday 23:00 KST** | 🤖 Auto Slack report | Deathmatch results for Sat–Fri window |
| **Saturday morning** | 🥊 Human decision | Turn OFF loser, turn ON new challenger |

The cycle repeats every **Saturday to Friday** window.

### Setup

```bash
# Required
META_ACCESS_TOKEN=<read_only_token>
META_AD_ACCOUNT_ID=act_000000000000000
META_ADSET_ID=000000000000000000

# Optional
META_GRAPH_VERSION=v25.0
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Usage

```bash
# Install & build
npm install
npm run build

# Sample score output
npm run sample

# Manual report (terminal)
npm run review

# Slack delivery (verify with dry-run first)
npm run review:dry-run
npm run review:slack

# Custom date range
node build/scripts/review.js --since 2026-05-23 --until 2026-05-26
node build/scripts/review.js --slack --since 2026-05-23 --until 2026-05-26

# Last completed cycle (same as scheduled run)
node build/scripts/review.js --scheduled --slack
```

### MCP Server

```bash
node build/src/index.js
```

Registered tools:
- `send_auto_review_to_slack` — Generate deathmatch report and post to Slack
- `auto_review_latest_card_news` — Print deathmatch report to stdout
- `review_deathmatch_metrics` — Manual metric input → score calculation

### GitHub Actions (Scheduled)

`.github/workflows/meta-ads-report.yml` runs automatically every **Friday 23:00 KST** (`cron: 0 14 * * 5` UTC).

Required GitHub Secrets:
- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- `META_ADSET_ID`
- `SLACK_WEBHOOK_URL`

Manual trigger: `GitHub UI → Actions → Meta Ads Report → Run workflow`.

### Tech Stack

- TypeScript, Node.js 20+
- [Meta Graph API](https://developers.facebook.com/docs/graph-api) v25.0 (read-only)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Slack Incoming Webhook
- node:test for unit tests
