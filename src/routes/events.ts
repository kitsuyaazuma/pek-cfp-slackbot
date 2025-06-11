import { Hono } from "hono";
import { Bindings, SlackOuterEvent } from "../types";
import { postSlackMessage } from "../utils/slack";
import { getProposal, getUuidFromMessage } from "../utils/fortee";

const app = new Hono<{ Bindings: Bindings }>();

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
  const proposal = await getProposal(uuid);
  if (proposal === null) {
    return c.text("No proposal found for the given UUID", 200);
  }

  await postSlackMessage(
    c.env.SLACK_BOT_TOKEN,
    channel,
    ts,
    `Title: ${proposal.title}\nSpeaker: ${proposal.speaker.name}`,
  );
  return c.text("OK", 200);
});

app.onError((err, c) => {
  console.error("Error in events route:", err);
  return c.text("Internal Server Error", 500);
});

export default app;
