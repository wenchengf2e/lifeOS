import { Hono } from "hono";
import { logger } from "hono/logger";
import type { BootstrapResponse, ExportResponse } from "../shared/types";
import { requireUser } from "./auth";
import { getDb } from "./db/client";
import { loadAll, loadTelosExport } from "./db/queries";
import checkinsRoute from "./routes/checkins";
import docsRoute from "./routes/docs";
import energyRoute from "./routes/energy";
import fearsRoute from "./routes/fears";
import goalsRoute from "./routes/goals";
import itemsRoute from "./routes/items";
import patternsRoute from "./routes/patterns";
import reviewsRoute from "./routes/reviews";
import telosRoute from "./routes/telos";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.use("*", logger());

app.get("/health", (c) => c.json({ ok: true }));

// Everything below this line requires a Cloudflare Access identity.
app.use("/api/*", requireUser);

app.get("/api/me", (c) => c.json({ email: c.get("userEmail") }));

app.get("/api/bootstrap", async (c) => {
  const user = c.get("userEmail");
  const data = await loadAll(getDb(c.env.DB), user);
  const response: BootstrapResponse = {
    user: { email: user },
    ...data,
  };
  return c.json(response);
});

app.get("/api/export", async (c) => {
  const user = c.get("userEmail");
  const db = getDb(c.env.DB);
  // 罗盘数据不进 bootstrap，但手动导出备份时要完整包含。
  const [data, telos] = await Promise.all([loadAll(db, user), loadTelosExport(db, user)]);
  const response: ExportResponse = {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: { email: user },
    ...data,
    ...telos,
  };
  return c.json(response);
});

app.route("/api/checkins", checkinsRoute);
app.route("/api/docs", docsRoute);
app.route("/api/energy", energyRoute);
app.route("/api/fears", fearsRoute);
app.route("/api/goals", goalsRoute);
app.route("/api/items", itemsRoute);
app.route("/api/reviews", reviewsRoute);
app.route("/api/patterns", patternsRoute);
app.route("/api/telos", telosRoute);

app.notFound((c) => c.json({ error: "not_found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal_error" }, 500);
});

export default app;
