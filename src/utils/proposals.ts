import { z } from "zod";
import { Bindings } from "../types";

export const PENDING_PROPOSAL_PREFIX = "PENDING:";

export const formatValidationErrors = (error: z.ZodError) => {
  let message = "❌ プロポーザルの内容に以下の問題が見つかりました\n\n";
  for (const issue of error.issues) {
    message += `• ${issue.message}\n`;
  }
  return message;
};

export const handleInvalidProposal = async (
  env: Bindings,
  uuid: string,
  error: z.ZodError | Error,
) => {
  let threadMessage = `https://fortee.jp/platform-engineering-kaigi-2025/proposal/${uuid}`;
  let blocks: Record<string, unknown>[] | undefined = undefined;

  if (error instanceof z.ZodError) {
    threadMessage += `\n\n${formatValidationErrors(error)}`;

    let oncallUser = await env.PROPOSAL_ONCALL_KV.get(uuid);
    if (
      oncallUser === null ||
      oncallUser.replace(PENDING_PROPOSAL_PREFIX, "") === ""
    ) {
      const users = env.PROPOSAL_ONCALL_USERS.split(",")
        .map((user) => user.trim())
        .filter((user) => user !== "");
      if (users.length > 0) {
        oncallUser = users[Math.floor(Math.random() * users.length)];
        await env.PROPOSAL_ONCALL_KV.put(uuid, oncallUser);
      }
    }

    if (oncallUser?.startsWith(PENDING_PROPOSAL_PREFIX)) {
      const pendingUserId = oncallUser.replace(PENDING_PROPOSAL_PREFIX, "");
      threadMessage += `\n<@${pendingUserId}> さんが保留中です！⛔️`;
      blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: threadMessage,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "保留を解除する",
              },
              style: "primary",
              value: uuid,
              action_id: "unpending_proposal",
            },
          ],
        },
      ];
    } else if (oncallUser) {
      threadMessage += `\n<@${oncallUser}> さん、内容の確認をお願いします！🙏`;
      blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: threadMessage,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "保留中にする",
              },
              style: "danger",
              value: uuid,
              action_id: "pending_proposal",
            },
          ],
        },
      ];
    }
  } else {
    threadMessage += `\n\n🚨 エラーが発生しました\n\n${error.message}`;
  }

  return { threadMessage, blocks };
};

export const setProposalStatusPending = async (
  kv: KVNamespace,
  uuid: string,
): Promise<void> => {
  const userId = await kv.get(uuid);
  if (userId === null || userId === "") {
    await kv.put(uuid, PENDING_PROPOSAL_PREFIX);
  } else if (!userId.startsWith(PENDING_PROPOSAL_PREFIX)) {
    await kv.put(uuid, PENDING_PROPOSAL_PREFIX + userId);
  }
};

export const setProposalStatusUnpending = async (
  kv: KVNamespace,
  uuid: string,
): Promise<void> => {
  const userId = await kv.get(uuid);
  if (userId === null || userId === "") {
    return;
  } else if (userId.startsWith(PENDING_PROPOSAL_PREFIX)) {
    await kv.put(uuid, userId.replace(PENDING_PROPOSAL_PREFIX, ""));
  }
};
