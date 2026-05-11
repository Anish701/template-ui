import fastifyPlugin from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface Session {
    user?: {
      email: string;
      email_verified: boolean;
      family_name: string;
      given_name: string;
      name: string;
      preferred_username: string;
      sub: string;
      /** Set when nginx forwards gateway identity headers (AUTH_ENABLED=false). */
      displayName?: string;
    };
    token?: {
      access_token: string;
      expires_at: number;
      id_token: string;
      refresh_token: string;
      scope: string;
    };
    redirectUri?: string;
  }
}

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

function applyAuthDisabledSession(request: FastifyRequest): void {
  const dummyUser = {
    email: "johnwick@redhat.com",
    email_verified: false,
    family_name: "Wick",
    given_name: "John",
    name: "John Wick",
    preferred_username: "johnwick",
    sub: "1sdsd1ef7-7e0c-4c45-a250-dssdsd",
    displayName: "John",
  };

  const email = headerValue(request.headers["x-auth-user-email"]);
  const displayName = headerValue(request.headers["x-auth-user-name"]);
  const sub = headerValue(request.headers["x-auth-user-sub"]);

  if (email || sub) {
    const resolvedEmail = email ?? sub ?? "";
    const resolvedSub = sub ?? email ?? "";
    const resolvedName = displayName ?? resolvedEmail;
    const localPart = resolvedEmail.includes("@")
      ? resolvedEmail.slice(0, resolvedEmail.indexOf("@"))
      : resolvedEmail;

    request.session.user = {
      email: resolvedEmail,
      email_verified: true,
      family_name: "",
      given_name: "",
      name: resolvedName,
      preferred_username: localPart || resolvedSub,
      sub: resolvedSub,
      displayName: resolvedName,
    };
  } else {
    request.session.user = dummyUser;
  }

  const xToken = headerValue(request.headers["x-token"]);
  if (xToken) {
    request.session.token = { access_token: xToken } as NonNullable<
      typeof request.session.token
    >;
  }
}

function authCheck(
  instance: FastifyInstance,
  _options: Record<string, unknown>,
  done: (err?: Error) => void
) {
  instance.addHook("preHandler", (request: FastifyRequest, reply: FastifyReply, next: () => void) => {
    if (process.env.AUTH_ENABLED === "false") {
      applyAuthDisabledSession(request);
    }

    if (request.session?.user) {
      next();
      return;
    }

    request.session.redirectUri = request.url;
    reply.redirect("/login");
  });
  done();
}

export default fastifyPlugin(authCheck);
