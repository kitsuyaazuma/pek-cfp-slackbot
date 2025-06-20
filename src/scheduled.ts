import { formatValidationErrors } from "./routes/events";
import { Bindings } from "./types";
import { validateAllProposals } from "./utils/fortee";
import { postSlackMessage } from "./utils/slack";
import { z } from "zod";

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

  const validProposals = validationResultsWithInfo.filter((v) => v.success);
  const invalidProposals = validationResultsWithInfo.filter((v) => !v.success);

  let summaryMessage = "📣 *CFPステータスチェック*\n\n";
  summaryMessage += validationResultsWithInfo
    .map(({ success }) => {
      return success ? "🟩" : "🟥";
    })
    .join("");
  summaryMessage += `\n\n*合計: ${validationResultsWithInfo.length}件、有効: ${validProposals.length}件、無効: ${invalidProposals.length}件*`;

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

  for (const { error, uuid } of invalidProposals) {
    if (uuid === undefined) {
      continue;
    }
    let threadMessage = `https://fortee.jp/platform-engineering-kaigi-2025/proposal/${uuid}`;
    if (error instanceof z.ZodError) {
      threadMessage += `\n\n${formatValidationErrors(error)}`;

      let oncallUser = await env.PROPOSAL_ONCALL_KV.get(uuid);
      if (oncallUser === null) {
        const users = env.PROPOSAL_ONCALL_USERS.split(",")
          .map((user) => user.trim())
          .filter((user) => user !== "");
        if (users.length > 0) {
          oncallUser = users[Math.floor(Math.random() * users.length)];
          env.PROPOSAL_ONCALL_KV.put(uuid, oncallUser);
        }
      }
      threadMessage += `\n<@${oncallUser}> さん、内容の確認をお願いします！🙏`;
    } else {
      threadMessage += `\n\n🚨 エラーが発生しました\n\n${error.message}`;
    }
    await postSlackMessage(
      env.SLACK_BOT_TOKEN,
      env.SLACK_STATUS_CHECK_CHANNEL,
      threadMessage,
      thread_ts,
    );
  }
};
