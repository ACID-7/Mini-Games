const DEFAULT_NAMESPACE = "partyFusionRooms";
const DEFAULT_PROJECT_ID = "minigames-ee135";

function trimTrailingSlash(value = "") {
  return String(value).replace(/\/+$/, "");
}

function getDatabaseUrl() {
  const explicit = trimTrailingSlash(process.env.FIREBASE_DATABASE_URL);
  if (explicit) return explicit;

  const projectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;

  return `https://${projectId}-default-rtdb.firebaseio.com`;
}

function getNamespace() {
  return process.env.FIREBASE_ROOM_NAMESPACE || DEFAULT_NAMESPACE;
}

function getAuthParam() {
  return (
    process.env.FIREBASE_DATABASE_SECRET ||
    process.env.FIREBASE_AUTH_TOKEN ||
    ""
  );
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function roomUrl(databaseUrl, namespace, code) {
  return `${databaseUrl}/${encodeURIComponent(namespace)}/${encodeURIComponent(code)}.json`;
}

function buildUrlWithAuth(url, authToken) {
  if (!authToken) return url;
  const next = new URL(url);
  next.searchParams.set("auth", authToken);
  return next.toString();
}

async function parseResponse(response) {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Firebase returned an invalid response body (${response.status}).`,
      );
    }
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Firebase request failed with ${response.status}.`;
    throw new Error(message);
  }

  return data;
}

export function createFirebaseStore() {
  const databaseUrl = getDatabaseUrl();
  const authToken = getAuthParam();
  const namespace = getNamespace();

  async function request(code, method, value) {
    const normalizedCode = normalizeCode(code);
    const url = buildUrlWithAuth(
      roomUrl(databaseUrl, namespace, normalizedCode),
      authToken,
    );

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: value === undefined ? undefined : JSON.stringify(value),
    });

    return parseResponse(response);
  }

  return {
    async getRoom(code) {
      const normalizedCode = normalizeCode(code);
      if (!normalizedCode) return null;
      return request(normalizedCode, "GET");
    },
    async saveRoom(room) {
      const normalizedCode = normalizeCode(room?.code);
      if (!normalizedCode) throw new Error("Room code is required.");
      const payload = { ...room, code: normalizedCode };
      await request(normalizedCode, "PUT", payload);
    },
    async deleteRoom(code) {
      const normalizedCode = normalizeCode(code);
      if (!normalizedCode) return;
      await request(normalizedCode, "DELETE");
    },
    async roomExists(code) {
      return Boolean(await this.getRoom(code));
    },
    getInfo() {
      return {
        databaseUrl,
        namespace,
        hasAuthToken: Boolean(authToken),
      };
    },
  };
}
