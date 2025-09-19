import { getApiBase, getToken } from "./config.js";

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function jsonFetch(path, options = {}) {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  // Non-2xx → try to extract a useful error
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const j = JSON.parse(text);
          if (j && j.error) msg = j.error;
        } catch {
          // keep msg as is; text wasn't JSON
        }
      }
    } catch {}
    throw new Error(msg);
  }

  // 204/205 or empty body → return null
  if (res.status === 204 || res.status === 205) return null;

  // If body exists, parse it; if empty, return null
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // Not JSON; return raw text in case you want it
    return { raw: text };
  }
}

export const api = {
  whoami: () => jsonFetch("/auth/whoami"),
  auth: {
    login: (email, password) =>
      jsonFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (username, email, password) =>
      jsonFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      }),
  },
  posts: {
    listPublished: () => jsonFetch("/posts"),

    // for logged-in user posts
    mine: () => jsonFetch("/posts/mine"),

    // CRUD
    create: (data) =>
      jsonFetch("/posts", { method: "POST", body: JSON.stringify(data) }),
    update: (uid, data) =>
      jsonFetch(`/posts/${uid}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (uid) => jsonFetch(`/posts/${uid}`, { method: "DELETE" }),

    getOne: (postUid) => jsonFetch(`/posts/${postUid}`), // expects 404 if not found / not authorized
    commentsFor: (postUid) => jsonFetch(`/posts/${postUid}/comments`),
    addComment: (postUid, body) =>
      jsonFetch(`/posts/${postUid}/comments`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    // assuming your API exposes these routes:
    deleteComment: (postUid, commentUid) =>
      jsonFetch(`/posts/${postUid}/comments/${commentUid}`, {
        method: "DELETE",
      }),
    editComment: (postUid, commentUid, content) =>
      jsonFetch(`/posts/${postUid}/comments/${commentUid}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      }),
  },
};
