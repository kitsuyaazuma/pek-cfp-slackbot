# pek-cfp-slackbot

A Slackbot for the Platform Engineering Kaigi CFP

## Getting Started

```bash
pnpm install
pnpm run dev
```

## Deployment

```bash
pnpm wrangler kv namespace create PROPOSAL_ONCALL_KV
pnpm wrangler kv namespace create PROPOSAL_UUID_KV

pnpm run deploy

pnpm wrangler secret put SLACK_BOT_TOKEN
pnpm wrangler secret put SLACK_SIGNING_SECRET
pnpm wrangler secret put PROPOSAL_ONCALL_USERS
pnpm wrangler secret put SLACK_STATUS_CHECK_CHANNEL
pnpm wrangler secret put CLOUDFLARE_PAGES_DEPLOY_HOOK_URL
pnpm wrangler secret put TRIGGER_USER_ID
pnpm wrangler secret put SLACK_BOT_USER_ID
```

## Type Generation

```bash
pnpm run cf-typegen
```
