const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT) || 3000;
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SUPABASE_ANON_KEY = String(process.env.SUPABASE_ANON_KEY || "").trim();
const SESSION_COOKIE_NAME = "naruto_archive_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SESSION_REFRESH_WINDOW_MS = 60 * 1000;
const MAX_BODY_BYTES = 25 * 1024 * 1024;
const STATIC_ROOT = __dirname;

const sessions = new Map();
const staticFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/script.js", "script.js"]
]);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8"
};

const server = http.createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    console.error("Unhandled request error", error);
    sendJson(response, error.status || 500, {
      error: error.message || "Unexpected server error."
    });
  });
});

server.listen(PORT, () => {
  console.log(`Naruto archive service listening on http://localhost:${PORT}`);
});

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    await handleApiRequest(request, response, url);
    return;
  }

  await serveStaticFile(response, url.pathname);
}

async function handleApiRequest(request, response, url) {
  try {
    if (request.method === "GET" && url.pathname === "/api/auth/session") {
      const session = await getSessionFromRequest(request, response, { validateUser: true });
      sendJson(response, 200, {
        configured: isSupabaseConfigured(),
        authenticated: Boolean(session),
        user: session ? publicSessionUser(session) : null
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      ensureConfigured();
      const body = await readJsonBody(request);
      const ownerName = String(body?.ownerName || "").trim();
      const email = String(body?.email || "").trim();
      const password = String(body?.password || "");

      if (!ownerName || !email || !password) {
        throw createHttpError(400, "Enter the public owner name, owner email, and password to continue.");
      }

      const authPayload = await supabaseRequest("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: {
          email,
          password
        },
        authRequest: true
      });

      const sessionId = createSession(authPayload, ownerName);
      setSessionCookie(response, sessionId);
      sendJson(response, 200, {
        authenticated: true,
        user: publicSessionUser(sessions.get(sessionId))
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      const sessionRecord = await getSessionFromRequest(request, response);
      if (sessionRecord) {
        try {
          await supabaseRequest("/auth/v1/logout", {
            method: "POST",
            accessToken: sessionRecord.accessToken,
            authRequest: true
          });
        } catch (error) {
          console.warn("Supabase logout request failed", error.message);
        }

        sessions.delete(sessionRecord.id);
      }

      clearSessionCookie(response);
      sendJson(response, 200, { authenticated: false });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/cards") {
      ensureConfigured();
      const cards = await supabaseRequest("/rest/v1/kayou_cards?select=*&order=created_at.desc");
      sendJson(response, 200, { cards: Array.isArray(cards) ? cards : [] });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/cards") {
      ensureConfigured();
      const session = await requireSession(request, response);
      const payload = await readJsonBody(request);
      validateCardPayload(payload);
      const cards = await supabaseRequest("/rest/v1/kayou_cards", {
        method: "POST",
        accessToken: session.accessToken,
        prefer: "return=representation",
        body: payload
      });
      sendJson(response, 201, { card: Array.isArray(cards) ? cards[0] || null : null });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/cards/bulk") {
      ensureConfigured();
      const session = await requireSession(request, response);
      const body = await readJsonBody(request);
      const cards = Array.isArray(body?.cards) ? body.cards : [];

      if (!cards.length) {
        throw createHttpError(400, "Provide at least one card to insert.");
      }

      cards.forEach(validateCardPayload);
      await supabaseRequest("/rest/v1/kayou_cards", {
        method: "POST",
        accessToken: session.accessToken,
        prefer: "return=representation",
        body: cards
      });
      sendJson(response, 200, { inserted: cards.length });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/cards/import") {
      ensureConfigured();
      const session = await requireSession(request, response);
      const body = await readJsonBody(request);
      const cards = Array.isArray(body?.cards) ? body.cards : [];

      if (!cards.length) {
        throw createHttpError(400, "Provide at least one card to import.");
      }

      cards.forEach(validateCardPayload);
      await supabaseRequest("/rest/v1/kayou_cards?on_conflict=id", {
        method: "POST",
        accessToken: session.accessToken,
        prefer: "resolution=merge-duplicates,return=representation",
        body: cards
      });
      sendJson(response, 200, { imported: cards.length });
      return;
    }

    const cardIdMatch = url.pathname.match(/^\/api\/cards\/([^/]+)$/);
    if (cardIdMatch && request.method === "PUT") {
      ensureConfigured();
      const session = await requireSession(request, response);
      const payload = await readJsonBody(request);
      const cardId = decodeURIComponent(cardIdMatch[1]);
      validateCardPayload(payload);
      const cards = await supabaseRequest(`/rest/v1/kayou_cards?id=eq.${encodeURIComponent(cardId)}`, {
        method: "PATCH",
        accessToken: session.accessToken,
        prefer: "return=representation",
        body: payload
      });
      sendJson(response, 200, { card: Array.isArray(cards) ? cards[0] || null : null });
      return;
    }

    if (cardIdMatch && request.method === "DELETE") {
      ensureConfigured();
      const session = await requireSession(request, response);
      const cardId = decodeURIComponent(cardIdMatch[1]);
      await supabaseRequest(`/rest/v1/kayou_cards?id=eq.${encodeURIComponent(cardId)}`, {
        method: "DELETE",
        accessToken: session.accessToken,
        prefer: "return=minimal"
      });
      sendJson(response, 200, { deleted: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/set-targets") {
      ensureConfigured();
      const targets = await supabaseRequest("/rest/v1/kayou_set_targets?select=*&order=set_name.asc");
      sendJson(response, 200, { setTargets: Array.isArray(targets) ? targets : [] });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/set-targets") {
      ensureConfigured();
      const session = await requireSession(request, response);
      const payload = await readJsonBody(request);
      validateSetTargetPayload(payload);
      const targets = await supabaseRequest("/rest/v1/kayou_set_targets", {
        method: "POST",
        accessToken: session.accessToken,
        prefer: "return=representation",
        body: payload
      });
      sendJson(response, 201, { setTarget: Array.isArray(targets) ? targets[0] || null : null });
      return;
    }

    const setTargetIdMatch = url.pathname.match(/^\/api\/set-targets\/([^/]+)$/);
    if (setTargetIdMatch && request.method === "PUT") {
      ensureConfigured();
      const session = await requireSession(request, response);
      const payload = await readJsonBody(request);
      const targetId = decodeURIComponent(setTargetIdMatch[1]);
      validateSetTargetPayload(payload);
      const targets = await supabaseRequest(`/rest/v1/kayou_set_targets?id=eq.${encodeURIComponent(targetId)}`, {
        method: "PATCH",
        accessToken: session.accessToken,
        prefer: "return=representation",
        body: payload
      });
      sendJson(response, 200, { setTarget: Array.isArray(targets) ? targets[0] || null : null });
      return;
    }

    if (setTargetIdMatch && request.method === "DELETE") {
      ensureConfigured();
      const session = await requireSession(request, response);
      const targetId = decodeURIComponent(setTargetIdMatch[1]);
      await supabaseRequest(`/rest/v1/kayou_set_targets?id=eq.${encodeURIComponent(targetId)}`, {
        method: "DELETE",
        accessToken: session.accessToken,
        prefer: "return=minimal"
      });
      sendJson(response, 200, { deleted: true });
      return;
    }

    throw createHttpError(404, "Route not found.");
  } catch (error) {
    if (error.status === 401) {
      clearSessionCookie(response);
    }

    sendJson(response, error.status || 500, {
      error: error.message || "Unexpected server error."
    });
  }
}

async function serveStaticFile(response, pathname) {
  const relativePath = staticFiles.get(pathname);
  if (!relativePath) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  const fullPath = path.join(STATIC_ROOT, relativePath);
  const extension = path.extname(relativePath);
  const contentType = contentTypes[extension] || "application/octet-stream";
  const content = await fs.readFile(fullPath);
  response.writeHead(200, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff"
  });
  response.end(content);
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw createHttpError(413, "Request body is too large.");
    }
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    throw createHttpError(400, "Request body must be valid JSON.");
  }
}

function sendJson(response, statusCode, payload) {
  if (response.writableEnded) {
    return;
  }

  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function ensureConfigured() {
  if (!isSupabaseConfigured()) {
    throw createHttpError(
      503,
      "The web service is missing SUPABASE_URL or SUPABASE_ANON_KEY. Add both environment variables before using the shared archive."
    );
  }
}

function validateCardPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw createHttpError(400, "Card payload is required.");
  }

  const title = String(payload.title || "").trim();
  const character = String(payload.character || "").trim();
  const setName = String(payload.set_name || "").trim();
  const ownerName = String(payload.owner_name || "").trim();

  if (!title || !character || !setName || !ownerName) {
    throw createHttpError(400, "Complete the owner name, title, character, and set fields before saving.");
  }

  if (String(payload.card_status || "") === "For Trade" && !String(payload.trade_contact || "").trim()) {
    throw createHttpError(400, "Add a public trade contact before publishing a trade listing.");
  }
}

function validateSetTargetPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw createHttpError(400, "Set target payload is required.");
  }

  const setName = String(payload.set_name || "").trim();
  const totalCards = Number(payload.total_cards);
  if (!setName || !Number.isFinite(totalCards) || totalCards < 1) {
    throw createHttpError(400, "Enter the set name and a valid total card count.");
  }
}

async function requireSession(request, response) {
  const session = await getSessionFromRequest(request, response, { validateUser: true });
  if (!session) {
    throw createHttpError(401, "Sign in as the owner before publishing changes.");
  }
  return session;
}

async function getSessionFromRequest(request, response, options = {}) {
  const sessionId = readSessionIdFromCookies(request.headers.cookie);
  if (!sessionId) {
    return null;
  }

  const currentSession = sessions.get(sessionId);
  if (!currentSession) {
    clearSessionCookie(response);
    return null;
  }

  let session = currentSession;

  if (session.expiresAt && session.expiresAt - Date.now() <= SESSION_REFRESH_WINDOW_MS && session.refreshToken) {
    try {
      const refreshedAuth = await supabaseRequest("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: {
          refresh_token: session.refreshToken
        },
        authRequest: true
      });
      session = updateSession(sessionId, refreshedAuth, session.ownerName);
    } catch (error) {
      sessions.delete(sessionId);
      clearSessionCookie(response);
      return null;
    }
  }

  if (options.validateUser) {
    try {
      const user = await supabaseRequest("/auth/v1/user", {
        method: "GET",
        accessToken: session.accessToken,
        authRequest: true
      });
      session.user = {
        id: user.id,
        email: user.email || session.user?.email || ""
      };
      sessions.set(sessionId, session);
    } catch (error) {
      sessions.delete(sessionId);
      clearSessionCookie(response);
      return null;
    }
  }

  return {
    id: sessionId,
    ...session
  };
}

function createSession(authPayload, ownerName) {
  const sessionId = crypto.randomUUID();
  updateSession(sessionId, authPayload, ownerName);
  return sessionId;
}

function updateSession(sessionId, authPayload, ownerName) {
  const nextSession = {
    accessToken: authPayload.access_token,
    refreshToken: authPayload.refresh_token,
    expiresAt: resolveSessionExpiry(authPayload),
    ownerName: String(ownerName || "").trim(),
    user: {
      id: authPayload.user?.id || "",
      email: authPayload.user?.email || ""
    }
  };

  sessions.set(sessionId, nextSession);
  return nextSession;
}

function resolveSessionExpiry(authPayload) {
  if (Number.isFinite(Number(authPayload?.expires_at))) {
    return Number(authPayload.expires_at) * 1000;
  }

  if (Number.isFinite(Number(authPayload?.expires_in))) {
    return Date.now() + Number(authPayload.expires_in) * 1000;
  }

  return Date.now() + 60 * 60 * 1000;
}

function publicSessionUser(session) {
  return {
    id: session.user?.id || "",
    email: session.user?.email || "",
    ownerName: session.ownerName || inferOwnerNameFromEmail(session.user?.email || "")
  };
}

function inferOwnerNameFromEmail(email) {
  const value = String(email || "").trim();
  if (!value.includes("@")) {
    return "Archive Owner";
  }

  const localPart = value.split("@")[0].replace(/[._-]+/g, " ").trim();
  if (!localPart) {
    return "Archive Owner";
  }

  return localPart.replace(/\b\w/g, (character) => character.toUpperCase());
}

function readSessionIdFromCookies(cookieHeader) {
  const cookies = parseCookies(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || "";
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[name] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function setSessionCookie(response, sessionId) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}; HttpOnly; Max-Age=${SESSION_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
  );
}

function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Max-Age=0; Path=/; SameSite=Lax`
  );
}

async function supabaseRequest(endpointPath, options = {}) {
  ensureConfigured();

  const headers = {
    apikey: SUPABASE_ANON_KEY
  };

  if (options.authRequest) {
    if (options.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`;
    }
  } else {
    headers.Authorization = `Bearer ${options.accessToken || SUPABASE_ANON_KEY}`;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  const response = await fetch(`${SUPABASE_URL}${endpointPath}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const rawBody = await response.text();
  const payload = parseSupabasePayload(rawBody);

  if (!response.ok) {
    throw createHttpError(response.status, readSupabaseError(payload, response.statusText));
  }

  return payload;
}

function parseSupabasePayload(rawBody) {
  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    return rawBody;
  }
}

function readSupabaseError(payload, fallback) {
  if (payload && typeof payload === "object") {
    if (typeof payload.msg === "string" && payload.msg.trim()) {
      return payload.msg;
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (typeof payload.error_description === "string" && payload.error_description.trim()) {
      return payload.error_description;
    }

    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return fallback || "Supabase request failed.";
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
