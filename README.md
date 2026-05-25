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

점수는 **3단계**로 계산됩니다.

#### 1단계: 원시 지표 → 1차 가공

Meta Ads Insights API가 반환하는 원시 값으로부터 세 가지 핵심 비율을 계산합니다.

| 비율 | 공식 | 설명 |
|---|---|---|
| **CPPV** (Cost Per Profile Visit) | `spendKrw ÷ instagramProfileVisits` | 방문 1명을 데려오는 데 든 비용 (원). 낮을수록 좋음 |
| **SaveRate** (저장률) | `saves ÷ reach` | 광고를 본 사람 중 저장한 비율. 높을수록 좋음 |
| **Frequency** (광고 빈도) | `impressions ÷ reach` | 같은 사람이 평균 몇 번 광고를 봤는지. 2.0 이상이면 피로도 발생 |

> CPPV 예시: 10,000원으로 방문 100명 → CPPV = 100원/방문
> SaveRate 예시: 도달 5,000명 중 저장 50회 → SaveRate = 1.0%
> Frequency 예시: 노출 15,000회 / 도달 5,000명 → Frequency = 3.0 (3회씩 본 것)

**Zero-division 방어**: 방문·도달이 0이면 해당 비율은 0으로 처리합니다.

#### 2단계: 1차 가공 → 3개 평가 점수

**① CostScore (방문 단가 점수) — 최대 120점**

챌린저가 챔피언 대비 CPPV가 얼마나 효율적인지 평가합니다.

- **양쪽 CPPV 모두 0** → 60점 (중립. 데이터 없음)
- **챔피언 CPPV = 0, 챌린저 CPPV > 0** → 120점 (챌린저 최대. 챔피언은 방문이 아예 없었음)
- **챔피언 CPPV > 0, 챌린저 CPPV = 0** → 0점 (챌린저 최소. 챌린저가 방문을 못 만듦)
- **양쪽 CPPV > 0** → `min((챔피언CPPV ÷ 챌린저CPPV) × 60, 120)`

> 예: 챔피언 CPPV 200원, 챌린저 CPPV 100원 → (200÷100)×60 = 120점 (만점!)
> 예: 챔피언 CPPV 100원, 챌린저 CPPV 200원 → (100÷200)×60 = 30점

**② AttrScore (매력도 점수) — 최대 80점**

챌린저 게시글이 챔피언 대비 저장률이 얼마나 높은지 평가합니다.

- **챔피언 저장률 > 0** → `min((챌린저저장률 ÷ 챔피언저장률) × 40, 80)`
- **챔피언 저장률 = 0, 챌린저 저장 수 > 0** → 40점
- **챔피언 저장률 = 0, 챌린저 저장 수 = 0** → 0점

> 예: 챔피언 저장률 1.0%, 챌린저 저장률 2.0% → (2.0÷1.0)×40 = 80점 (만점!)
> 예: 챔피언 저장률 1.0%, 챌린저 저장률 0.5% → (0.5÷1.0)×40 = 20점

**③ Penalty (광고 피로도 페널티) — 차감점 (무제한)**

챌린저 광고의 Frequency가 2.0을 넘으면 과도한 광노출로 점수를 차감합니다.

- **Frequency < 2.0** → 0 (페널티 없음)
- **Frequency >= 2.0** → `(frequency - 2.0) × 10`

> 예: Frequency 3.0 → (3.0 - 2.0) × 10 = 10점 차감
> 예: Frequency 5.0 → (5.0 - 2.0) × 10 = 30점 차감

#### 3단계: 최종 점수 및 승자

| 항목 | 계산식 |
|---|---|
| **Challenger HS** | `CostScore + AttrScore - Penalty` |
| **Champion HS** | 항상 **100점** (절대 기준) |
| **승자** | `Challenger HS > 100` → 🥊 **챌린저 승리** / 그 외 → 👑 **챔피언 유지** |

#### 실제 계산 예시

```
                        챔피언          챌린저
spendKrw               10,000원         5,000원
instagramProfileVisits     100명           100명
saves                       50회           100회
impressions              15,000회        10,000회
reach                      5,000명         5,000명

CPPV                  100원/방문        50원/방문
SaveRate                  1.0%            2.0%
Frequency                  3.0             2.0

CostScore  = min((100÷50)×60, 120) = 120점  ← 챌린저 방문 단가 2배 효율
AttrScore  = min((2.0÷1.0)×40, 80) =  80점  ← 챌린저 저장률 2배 높음
Penalty    = (3.0-2.0)×10          =  10점  ← 챌린저 빈도 3.0으로 페널티

Challenger HS = 120 + 80 - 10 = 190점  → 🥊 챌린저 압승!
Champion HS   = 100점 (고정)
```

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

The score is computed in **3 stages**.

#### Stage 1: Raw Metrics → Derived Ratios

Three key ratios are derived from the raw Meta Ads Insights API data:

| Ratio | Formula | Description |
|---|---|---|
| **CPPV** (Cost Per Profile Visit) | `spendKrw ÷ instagramProfileVisits` | Cost (KRW) per Instagram profile visit. Lower is better |
| **SaveRate** | `saves ÷ reach` | Proportion of reached users who saved the post. Higher is better |
| **Frequency** | `impressions ÷ reach` | Average number of times each user saw the ad. ≥ 2.0 indicates ad fatigue |

> CPPV example: 10,000KRW spent, 100 visits → CPPV = 100KRW/visit
> SaveRate example: 5,000 reach, 50 saves → SaveRate = 1.0%
> Frequency example: 15,000 impressions, 5,000 reach → Frequency = 3.0

**Zero-division guard**: If visits or reach is 0, the corresponding ratio is set to 0.

#### Stage 2: Derived Ratios → 3 Component Scores

**① CostScore (Visit Cost Score) — Max 120**

Evaluates how cost-efficient the challenger is compared to the champion.

- **Both CPPV = 0** → 60 (neutral — no visit data)
- **Champion CPPV = 0, Challenger CPPV > 0** → 120 (max for challenger — champion had zero visits)
- **Champion CPPV > 0, Challenger CPPV = 0** → 0 (min for challenger — challenger generated no visits)
- **Both CPPV > 0** → `min((championCPPV ÷ challengerCPPV) × 60, 120)`

> Example: Champion CPPV 200, Challenger CPPV 100 → (200÷100)×60 = 120 (max score!)
> Example: Champion CPPV 100, Challenger CPPV 200 → (100÷200)×60 = 30

**② AttrScore (Attractiveness Score) — Max 80**

Evaluates how engaging the challenger's content is compared to the champion's.

- **Champion SaveRate > 0** → `min((challengerSaveRate ÷ championSaveRate) × 40, 80)`
- **Champion SaveRate = 0, Challenger saves > 0** → 40
- **Champion SaveRate = 0, Challenger saves = 0** → 0

> Example: Champion SaveRate 1.0%, Challenger SaveRate 2.0% → (2.0÷1.0)×40 = 80 (max score!)
> Example: Champion SaveRate 1.0%, Challenger SaveRate 0.5% → (0.5÷1.0)×40 = 20

**③ Penalty (Ad Fatigue Penalty) — Deduction (Unlimited)**

Penalizes the challenger if its frequency exceeds 2.0 (overexposure).

- **Frequency < 2.0** → 0 (no penalty)
- **Frequency ≥ 2.0** → `(frequency - 2.0) × 10`

> Example: Frequency 3.0 → (3.0 - 2.0) × 10 = 10 points deducted
> Example: Frequency 5.0 → (5.0 - 2.0) × 10 = 30 points deducted

#### Stage 3: Final Health Score & Winner

| Component | Formula |
|---|---|
| **Challenger HS** | `CostScore + AttrScore - Penalty` |
| **Champion HS** | Always **100** (absolute baseline) |
| **Winner** | `Challenger HS > 100` → 🥊 **Challenger wins** / Otherwise → 👑 **Champion retains** |

#### Worked Example

```
                     Champion       Challenger
spendKrw               10,000KRW        5,000KRW
instagramProfileVisits     100              100
saves                       50              100
impressions              15,000           10,000
reach                      5,000            5,000

CPPV                  100KRW/visit     50KRW/visit
SaveRate                  1.0%             2.0%
Frequency                  3.0              2.0

CostScore  = min((100÷50)×60, 120) = 120  ← Challenger 2x more cost-efficient
AttrScore  = min((2.0÷1.0)×40, 80) =  80  ← Challenger 2x higher save rate
Penalty    = (3.0-2.0)×10          =  10  ← Challenger frequency 3.0

Challenger HS = 120 + 80 - 10 = 190  → 🥊 Challenger wins decisively!
Champion HS   = 100 (fixed)
```

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
