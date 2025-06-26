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
  const validationResultsWithInfo = await validateAllProposals();

  if (validationResultsWithInfo.length === 0) {
    console.error(
      "プロポーザルが見つからなかったか、取得に失敗したため処理を終了します",
    );
    return;
  }

  let validCount = 0,
    pendingCount = 0,
    invalidCount = 0;
  let summaryMessage = "📣 *CFPステータスチェック*\n\n";
  const statuses = await Promise.all(
    validationResultsWithInfo.map(async ({ success, uuid }) => {
      if (success) {
        validCount++;
        return "🟩";
      }
      if (uuid !== undefined) {
        const oncallUser = await env.PROPOSAL_ONCALL_KV.get(uuid);
        if (oncallUser?.startsWith(PENDING_PROPOSAL_PREFIX)) {
          pendingCount++;
          return "🟨";
        }
      }
      invalidCount++;
      return "🟥";
    }),
  );
  summaryMessage += statuses.join("");
  summaryMessage += `\n\n*合計: ${validationResultsWithInfo.length}件、有効: ${validCount}件、保留: ${pendingCount}件、無効: ${invalidCount}件*`;
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

  const pendingOrInvalidProposals = validationResultsWithInfo.filter(
    (v) => !v.success,
  );
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
