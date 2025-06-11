export type Bindings = {
  SLACK_BOT_TOKEN: string;
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
