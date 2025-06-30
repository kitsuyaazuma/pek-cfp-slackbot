import {
  handleInvalidProposal,
  PENDING_PROPOSAL_PREFIX,
} from "./utils/proposals";
import { Bindings } from "./types";
import { validateAllProposals } from "./utils/fortee";
import { postSlackMessage } from "./utils/slack";

export const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (
  /* eslint-disable @typescript-eslint/no-unused-vars */
  _controller: ScheduledController,
  env: Bindings,
  _ctx: ExecutionContext,
  /* eslint-enable @typescript-eslint/no-unused-vars */
) => {
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
