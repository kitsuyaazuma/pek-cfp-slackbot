import { Bindings } from "../types";
// import { postSlackMessage } from "./slack";

export const triggerCloudflarePagesDeploy = async (
  env: Bindings,
  // channel?: string,
) => {
  if (!env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL) {
    console.error("CLOUDFLARE_PAGES_DEPLOY_HOOK_URL is not set.");
    return;
  }
  try {
    const response = await fetch(env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL, {
      method: "POST",
    });
    // if (channel === undefined) {
    //   return;
    // }
    if (response.ok) {
      console.log("Cloudflare Pages deploy triggered successfully.");
      // await postSlackMessage(
      //   env.SLACK_BOT_TOKEN,
      //   channel,
      //   "🚀 Cloudflare Pagesのデプロイをトリガーしました",
      // );
    } else {
      console.error(
        `Failed to trigger Cloudflare Pages deploy: ${response.statusText}`,
      );
    }
  } catch (err) {
    console.error("Error triggering Cloudflare Pages deploy:", err);
  }
};
