import { Hono } from "hono";
import events from "./routes/events";
import { scheduled } from "./scheduled";

const app = new Hono();

app.route("/events", events);

export default {
  fetch: app.fetch,
  scheduled,
};
