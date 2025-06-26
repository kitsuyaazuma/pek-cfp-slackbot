import { z } from "zod";

const SLACK_API_URL = "https://slack.com/api";

export const BlockActionPayloadSchema = z.object({
  type: z.literal("block_actions"),
  actions: z.array(
    z.object({
      action_id: z.string(),
      value: z.string(),
    }),
  ),
  message: z.object({
    text: z.string(),
    ts: z.string(),
  }),
  channel: z.object({
    id: z.string(),
  }),
});

export const postSlackMessage = async (
  token: string,
  channel: string,
  text: string,
  blocks?: Record<string, unknown>[],
  thread_ts?: string,
): Promise<Response> => {
  const body: Record<string, unknown> = {
    channel: channel,
    text: text,
  };
  if (blocks) {
    body.blocks = blocks;
  }
  if (thread_ts) {
    body.thread_ts = thread_ts;
  }
  const res = await fetch(`${SLACK_API_URL}/chat.postMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res;
};

export const updateSlackMessage = async (
  token: string,
  channel: string,
  ts: string,
  text: string,
  blocks?: Record<string, unknown>[],
): Promise<Response> => {
  const body: Record<string, unknown> = {
    channel,
    ts,
    text,
  };
  if (blocks) {
    body.blocks = blocks;
  }
  const res = await fetch(`${SLACK_API_URL}/chat.update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res;
};
