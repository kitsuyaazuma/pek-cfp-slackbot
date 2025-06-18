export const postSlackMessage = async (
  token: string,
  channel: string,
  thread_ts: string,
  text: string,
) => {
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: channel,
      thread_ts: thread_ts,
      text: text,
    }),
  });
};
