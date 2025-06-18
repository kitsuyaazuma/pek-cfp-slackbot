export const postSlackMessage = async (
  token: string,
  channel: string,
  text: string,
  thread_ts?: string,
): Promise<Response> => {
  const body: Record<string, unknown> = {
    channel: channel,
    text: text,
  };
  if (thread_ts) {
    body.thread_ts = thread_ts;
  }
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return res;
};
