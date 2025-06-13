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
pnpm wrangler secret put SLACK_BOT_TOKEN
pnpm wrangler secret put SLACK_SIGNING_SECRET
```

## Type Generation

```bash
pnpm run cf-typegen
```
