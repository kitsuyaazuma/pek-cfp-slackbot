export type Bindings = {
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  PROPOSAL_ONCALL_KV: KVNamespace;
  PROPOSAL_UUID_KV: KVNamespace;
  PROPOSAL_ONCALL_USERS: string;
  SLACK_STATUS_CHECK_CHANNEL: string;
  CLOUDFLARE_PAGES_DEPLOY_HOOK_URL?: string;
  TRIGGER_USER_ID?: string;
  SLACK_BOT_USER_ID: string;
};

export type SlackAppMentionEvent = {
  type: "app_mention";
  user: string;
  text: string;
  ts: string;
  channel: string;
  event_ts: string;
};

export type SlackOuterEvent = {
  type: "url_verification" | "event_callback";
  challenge?: string;
  token?: string;
  event?: SlackAppMentionEvent;
};
