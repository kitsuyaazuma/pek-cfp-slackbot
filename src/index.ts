import { Hono } from "hono";
import events from "./routes/events";

const app = new Hono();

app.route("/events", events);

export default app;
