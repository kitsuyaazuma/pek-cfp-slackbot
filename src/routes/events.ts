import { Hono } from "hono";
import { Bindings, SlackOuterEvent } from "../types";
import { postSlackMessage } from "../utils/slack";
import { validateProposal, getUuidFromMessage } from "../utils/fortee";
import { verifySlackRequest } from "@kitsuyaazuma/hono-slack-verify";
import { handleInvalidProposal } from "../utils/proposals";

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", verifySlackRequest());

app.post("/", async (c) => {
  const body = await c.req.json<SlackOuterEvent>();

  if (body.type === "url_verification") {
    return c.json({ challenge: body.challenge });
  }

  if (body.event?.type !== "app_mention") {
    return c.text("", 200);
  }

  const { event } = body;
  const { text, channel, ts } = event;

  const uuid = getUuidFromMessage(text);
  if (uuid === null) {
    return c.text("No UUID found in message", 200);
  }
  const result = await validateProposal(uuid);
  let slackMessage = "";
  let blocks: Record<string, unknown>[] | undefined = undefined;
  if (result.success) {
    const { proposal } = result;
    slackMessage = `✅ プロポーザルの内容は有効です\n\n*タイトル* : ${proposal.title}\n*スピーカー* : ${proposal.speaker.name}`;
  } else {
    const { threadMessage, blocks: _blocks } = await handleInvalidProposal(
      c.env,
      uuid,
      result.error,
    );
    slackMessage = threadMessage;
    blocks = _blocks;
  }

  await postSlackMessage(
    c.env.SLACK_BOT_TOKEN,
    channel,
    slackMessage,
    blocks,
    ts,
  );
  return c.text("OK", 200);
});

app.onError((err, c) => {
  console.error("Error in events route:", err);
  return c.text("Internal Server Error", 500);
});

export default app;
