import { Hono } from "hono";
import events from "./routes/events";
import interactivity from "./routes/interactivity";
import { scheduled } from "./scheduled";

const app = new Hono();

app.route("/events", events);
app.route("/interactivity", interactivity);

export default {
  fetch: app.fetch,
  scheduled,
};
