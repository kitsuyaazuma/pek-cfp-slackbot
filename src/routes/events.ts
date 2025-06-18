import { Hono } from "hono";
import { Bindings, SlackOuterEvent } from "../types";
import { postSlackMessage } from "../utils/slack";
import { validateProposal, getUuidFromMessage } from "../utils/fortee";
import { z } from "zod";
import { verifySlackRequest } from "@kitsuyaazuma/hono-slack-verify";

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", verifySlackRequest());

const formatValidationErrors = (error: z.ZodError) => {
  let message = "❌ プロポーザルの内容に以下の問題が見つかりました\n\n";
  for (const issue of error.issues) {
    message += `• ${issue.message}\n`;
  }
  return message;
};

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
  if (result.success) {
    const { proposal } = result;
    slackMessage = `✅ プロポーザルの内容は有効です\n\n*タイトル* : ${proposal.title}\n*スピーカー* : ${proposal.speaker.name}`;
  } else {
    if (result.error instanceof z.ZodError) {
      const validationMessage = formatValidationErrors(result.error);
      slackMessage = validationMessage;

      const exsistingEntry = await c.env.PROPOSAL_ONCALL_KV.get(uuid);
      if (exsistingEntry === null) {
        const oncallUsers = c.env.PROPOSAL_ONCALL_USERS;
        if (oncallUsers) {
          const users = oncallUsers
            .split(",")
            .map((user) => user.trim())
            .filter((user) => user !== "");
          if (users.length > 0) {
            const oncallUser = users[Math.floor(Math.random() * users.length)];
            slackMessage += `\n<@${oncallUser}> さん、内容の確認をお願いします！🙏`;
            await c.env.PROPOSAL_ONCALL_KV.put(uuid, oncallUser);
          }
        }
      }
    } else {
      slackMessage = `🚨 エラーが発生しました\n\n${result.error.message}`;
    }
  }

  await postSlackMessage(c.env.SLACK_BOT_TOKEN, channel, ts, slackMessage);
  return c.text("OK", 200);
});

app.onError((err, c) => {
  console.error("Error in events route:", err);
  return c.text("Internal Server Error", 500);
});

export default app;
