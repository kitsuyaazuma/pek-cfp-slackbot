import { Bindings } from "../types";
import { postSlackMessage } from "./slack";

export const triggerCloudflarePagesDeploy = async (
  env: Bindings,
  channel: string,
  ts: string,
) => {
  if (!env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL) {
    console.error("CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is not set.");
    return;
  }
  try {
    const response = await fetch(env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL, {
      method: "POST",
    });
    if (response.ok) {
      await postSlackMessage(
        env.SLACK_BOT_TOKEN,
        channel,
        "🚀 Cloudflare Pagesのデプロイをトリガーしました",
        undefined,
        ts,
      );
    } else {
      await postSlackMessage(
        env.SLACK_BOT_TOKEN,
        channel,
        `❌ Cloudflare Pagesのデプロイに失敗しました：${response.statusText}`,
        undefined,
        ts,
      );
    }
  } catch (err) {
    console.error("Error triggering Cloudflare Pages deploy:", err);
  }
};
