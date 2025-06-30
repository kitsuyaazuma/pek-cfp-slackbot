import {
  handleInvalidProposal,
  PENDING_PROPOSAL_PREFIX,
} from "./utils/proposals";
import { Bindings } from "./types";
import { getAllProposals, validateAllProposals } from "./utils/fortee";
import { postSlackMessage } from "./utils/slack";

const LAST_PROPOSALS_KEY = "last_proposals_uuids";

const checkNewProposals = async (env: Bindings) => {
  const results = await getAllProposals();
  const currentUuids: Set<string> = new Set(
    results.map((proposal) => proposal.uuid),
  );

  const lastUuidsJson = await env.PROPOSAL_UUID_KV.get(LAST_PROPOSALS_KEY);
  const lastUuids = new Set<string>(
    lastUuidsJson ? JSON.parse(lastUuidsJson) : [],
  );

  const newUuids = [...currentUuids].filter((uuid) => !lastUuids.has(uuid));

  if (newUuids.length > 0) {
    console.log(`Found ${newUuids.length} new proposals.`);
    const newProposals = results.filter((result) =>
      newUuids.includes(result.uuid),
    );

    for (const proposal of newProposals) {
      let message = `<@${env.SLACK_BOT_USER_ID}>\n📣 *新しいプロポーザルが投稿されました！*\n\n`;
      message += `https://fortee.jp/platform-engineering-kaigi-2025/proposal/${proposal.uuid}\n`;
      message += `*タイトル* ：${proposal.title}\n*スピーカー* ：${proposal.speaker.name}\n`;
      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: message,
          },
        },
      ];
      await postSlackMessage(
        env.SLACK_BOT_TOKEN,
        env.SLACK_STATUS_CHECK_CHANNEL,
        message,
        blocks,
      );
    }
  } else {
    console.log("No new proposals found.");
  }

  await env.PROPOSAL_UUID_KV.put(
    LAST_PROPOSALS_KEY,
    JSON.stringify([...currentUuids]),
  );
};

const checkAllProposalsStatus = async (env: Bindings) => {
  const validationResults = await validateAllProposals();

  if (validationResults.length === 0) {
    console.error(
      "プロポーザルが見つからなかったか、取得に失敗したため処理を終了します",
    );
    return;
  }

  const invalidUuids = validationResults
    .map((result) => {
      if (!result.success) {
        return result.uuid;
      }
      return undefined;
    })
    .filter((uuid): uuid is string => uuid !== undefined);

  const oncallUserMap: Map<string, string | null> = new Map();
  if (invalidUuids.length > 0) {
    const values = await env.PROPOSAL_ONCALL_KV.get(invalidUuids);
    if (values) {
      Object.entries(values).forEach(([key, value]) => {
        oncallUserMap.set(key, value ?? null);
      });
    }
  }

  let validCount = 0,
    pendingCount = 0,
    invalidCount = 0;
  let summaryMessage = "📣 *CFPステータスチェック*\n\n";
  const statuses = validationResults.map((result) => {
    if (result.success) {
      validCount++;
      return "🟩";
    }
    if (result.uuid !== undefined) {
      const oncallUser = oncallUserMap.get(result.uuid);
      if (oncallUser?.startsWith(PENDING_PROPOSAL_PREFIX)) {
        pendingCount++;
        return "🟨";
      }
    }
    invalidCount++;
    return "🟥";
  });
  summaryMessage += statuses.join("");
  summaryMessage += `\n\n*合計: ${validationResults.length}件、有効: ${validCount}件、保留: ${pendingCount}件、無効: ${invalidCount}件*`;
  const res = await postSlackMessage(
    env.SLACK_BOT_TOKEN,
    env.SLACK_STATUS_CHECK_CHANNEL,
    summaryMessage,
  );
  const resJson = await res.json<{
    ok: boolean;
    ts: string;
    error?: string;
  }>();
  if (!resJson.ok) {
    console.error(`Slackへのメッセージ送信に失敗しました：${resJson.error}`);
    return;
  }

  const thread_ts = resJson.ts;

  const pendingOrInvalidProposals = validationResults.filter((v) => !v.success);
  for (const { error, uuid } of pendingOrInvalidProposals) {
    if (uuid === undefined) {
      continue;
    }
    const { threadMessage, blocks } = await handleInvalidProposal(
      env,
      uuid,
      error,
    );
    await postSlackMessage(
      env.SLACK_BOT_TOKEN,
      env.SLACK_STATUS_CHECK_CHANNEL,
      threadMessage,
      blocks,
      thread_ts,
    );
  }
};

export const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (
  controller: ScheduledController,
  env: Bindings,
  ctx: ExecutionContext,
) => {
  switch (controller.cron) {
    case "* * * * *":
      ctx.waitUntil(checkNewProposals(env));
      break;
    default:
      ctx.waitUntil(checkAllProposalsStatus(env));
      break;
  }
};
