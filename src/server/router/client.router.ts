import * as path from "node:path";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import authCheckPlugin from "../plugins/auth-check.plugin.js";
import { basePath, apiBasePath } from "../utils/config.js";

function headerValue(header: unknown): string | undefined {
  if (typeof header === "string") {
    const t = header.trim();
    return t.length > 0 ? t : undefined;
  }
  if (Array.isArray(header) && header.length > 0 && typeof header[0] === "string") {
    const t = header[0].trim();
    return t.length > 0 ? t : undefined;
  }
  return undefined;
}

/** JWT `exp` claim → milliseconds since epoch (no signature verification; display only). */
function jwtExpiryMs(accessToken: string): number | undefined {
  try {
    const parts = accessToken.split(".");
    if (parts.length < 2) return undefined;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

const appData = {
  apiUrl: apiBasePath || "/api",
  basePath,
};

async function routes(fastify: FastifyInstance) {
  await fastify.register(authCheckPlugin);

  await fastify.register(import("@fastify/static"), {
    root: path.join(process.cwd(), "dist/frontend"),
    prefix: "/dist/frontend",
    decorateReply: false,
  });

  await fastify.register(import("@fastify/url-data"));

  fastify.get("/_health", (request: FastifyRequest, reply: FastifyReply) => {
    fastify.log.info(`Health check request ${request.url}`);
    reply.send("OK");
  });

  fastify.get("/auth/refresh", (request: FastifyRequest, reply: FastifyReply) => {
    const xToken = headerValue(request.headers["x-token"]);
    if (!xToken) {
      return reply.send({ message: "ValidToken" });
    }

    const expiryMs = jwtExpiryMs(xToken);
    const expiresAtIso = expiryMs ? new Date(expiryMs).toISOString() : undefined;

    request.session.token = { access_token: xToken } as NonNullable<
      typeof request.session.token
    >;

    return reply.send({
      message: "RefreshedToken",
      token: {
        access_token: xToken,
        expires_at: expiresAtIso,
      },
    });
  });

  fastify.get("/auth/refresh-token", (request: FastifyRequest, reply: FastifyReply) => {
    const xToken = headerValue(request.headers["x-token"]);
    if (!xToken) {
      return reply.send({ message: "No token available" });
    }
    return reply.send({ token: { access_token: xToken } });
  });

  fastify.get("/*", (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    const { user, token } = session;

    const accessToken =
      token?.access_token ?? headerValue(request.headers["x-token"]);

    let tokenExpiresIso: string | undefined;
    if (token?.expires_at != null && typeof token.expires_at === "number") {
      const ms =
        token.expires_at < 1e12 ? token.expires_at * 1000 : token.expires_at;
      tokenExpiresIso = new Date(ms).toISOString();
    }

    const jwtMs = accessToken ? jwtExpiryMs(accessToken) : undefined;
    const fromJwtIso =
      jwtMs === undefined ? undefined : new Date(jwtMs).toISOString();

    const userRecord = user as Record<string, unknown> | undefined;
    const userExpires =
      typeof userRecord?.expiresAt === "string" ? userRecord.expiresAt : undefined;

    const userData = {
      ...user,
      displayName:
        (typeof userRecord?.displayName === "string"
          ? userRecord.displayName
          : undefined) ?? user?.name,
      accessToken,
      expiresAt: tokenExpiresIso ?? fromJwtIso ?? userExpires,
    };

    reply.type("text/html");
    reply.send(`<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Template UI</title>
                        <link rel="stylesheet" href="/dist/frontend/template-ui.css">
                    </head>
                    <body>
                        <div id="root"></div>
                        <script>
                        window.USER_DATA = ${JSON.stringify(userData || {})}
                        window.APP_DATA = ${JSON.stringify(appData)}
                        </script>
                        <script src="/dist/frontend/main.umd.js"></script>
                        
                    </body>
                    </html>
                    `);
  });
}

export { routes as clientRoutes };
