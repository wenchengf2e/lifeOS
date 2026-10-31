import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./types";

/**
 * The Worker is expected to sit behind Cloudflare Access.
 *
 * In production Access authenticates the request at the edge and adds
 * `Cf-Access-Authenticated-User-Email`. We additionally restrict the app to
 * OWNER_EMAIL so that even a misconfigured Access policy cannot expose
 * another user's data.
 *
 * Local development (localhost) is allowed without Access so `vite` and
 * `wrangler dev` work out of the box.
 */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const url = new URL(c.req.url);
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1" ||
    url.hostname.endsWith(".localhost");

  let email: string | undefined;

  if (isLocal) {
    email = c.env.OWNER_EMAIL || "dev@local";
  } else {
    email = c.req.header("Cf-Access-Authenticated-User-Email")?.trim();
  }

  if (!email) {
    return c.json(
      {
        error: "unauthorized",
        message: "Cloudflare Access authentication is required.",
      },
      401,
    );
  }

  if (c.env.OWNER_EMAIL && email !== c.env.OWNER_EMAIL) {
    return c.json({ error: "forbidden", message: "This LifeOS belongs to another account." }, 403);
  }

  c.set("userEmail", email);
  await next();
};
