import { Hono } from "hono";
import { Bindings } from "../types";
import { BlockActionPayloadSchema, updateSlackMessage } from "../utils/slack";
import { validateProposal } from "../utils/fortee";
import { verifySlackRequest } from "@kitsuyaazuma/hono-slack-verify";
import {
  setProposalStatusPending,
  setProposalStatusUnpending,
  handleInvalidProposal,
} from "../utils/proposals";

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", verifySlackRequest());

app.post("/", async (c) => {
  const body = await c.req.text();
  const payload = new URLSearchParams(body).get("payload");
  if (!payload) {
    return c.text("Bad Request: Missing payload", 400);
  }
  const bloackActionPayload = BlockActionPayloadSchema.parse(
    JSON.parse(payload.toString()),
  );

  if (bloackActionPayload.type === "block_actions") {
    for (const action of bloackActionPayload.actions) {
      if (
        action.action_id === "pending_proposal" ||
        action.action_id === "unpending_proposal"
      ) {
        const uuid = action.value;
        if (action.action_id === "pending_proposal") {
          await setProposalStatusPending(c.env.PROPOSAL_ONCALL_KV, uuid);
        } else if (action.action_id === "unpending_proposal") {
          await setProposalStatusUnpending(c.env.PROPOSAL_ONCALL_KV, uuid);
        }

        const result = await validateProposal(uuid);
        let slackMessage = "";
        let blocks: Record<string, unknown>[] | undefined = undefined;
        if (result.success) {
          const { proposal } = result;
          slackMessage = `✅ プロポーザルの内容は有効です\n\n*タイトル* : ${proposal.title}\n*スピーカー* : ${proposal.speaker.name}`;
        } else {
          const { threadMessage, blocks: _blocks } =
            await handleInvalidProposal(c.env, uuid, result.error);
          slackMessage = threadMessage;
          blocks = _blocks;
        }
        await updateSlackMessage(
          c.env.SLACK_BOT_TOKEN,
          bloackActionPayload.channel.id,
          bloackActionPayload.message.ts,
          slackMessage,
          blocks,
        );
        return c.text("OK", 200);
      }
    }
  }

  return c.text("OK", 200);
});

app.onError((err, c) => {
  console.error("Error in interactivity route:", err);
  return c.text("Internal Server Error", 500);
});

export default app;
