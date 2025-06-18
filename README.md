# pek-cfp-slackbot

A Slackbot for the Platform Engineering Kaigi CFP

## Getting Started

```bash
pnpm install
pnpm run dev
```

## Deployment

```bash
pnpm run deploy
# pnpm wrangler kv namespace create PROPOSAL_ONCALL_KV
pnpm wrangler secret put SLACK_BOT_TOKEN
pnpm wrangler secret put SLACK_SIGNING_SECRET
pnpm wrangler secret put PROPOSAL_ONCALL_USERS
pnpm wrangler secret put SLACK_STATUS_CHECK_CHANNEL
```

## Type Generation

```bash
pnpm run cf-typegen
```
