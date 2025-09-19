import { api } from "./api.js";
import { getApiBase, setApiBase, getToken, setToken } from "./config.js";

// header elements
const els = {
  myPostsLink: document.getElementById("my-posts-link"),
  loginLink: document.getElementById("login-link"),
  registerLink: document.getElementById("register-link"),
  logoutLink: document.getElementById("logout-link"),
  apiBase: document.getElementById("api-base"),
  saveApi: document.getElementById("save-api"),
  apiStatus: document.getElementById("api-status"),
};

// page elements
const postTitle = document.getElementById("post-title");
const postMeta = document.getElementById("post-meta");
const postContent = document.getElementById("post-content");
const commentList = document.getElementById("comment-list");

const form = document.getElementById("comment-form");
const guestFields = document.getElementById("guest-fields");
const err = document.getElementById("comment-error");

// parse ?uid=...
const params = new URLSearchParams(window.location.search);
const postUid = params.get("uid");

let currentUser = null;
let currentPost = null;

init();

async function init() {
  // wire API base UI
  els.apiBase.value = getApiBase();
  els.saveApi.addEventListener("click", () => {
    const val = els.apiBase.value.trim();
    if (!val) return;
    setApiBase(val);
    els.apiStatus.textContent = "Saved. Reloading…";
    setTimeout(() => window.location.reload(), 300);
  });

  els.logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    setToken(null);
    window.location.href = "/";
  });

  // auth state
  await refreshAuthState();

  // load post + comments
  if (!postUid) {
    renderNotFound("Missing post id");
    return;
  }
  await loadPost();
  await loadComments();

  // comment form behavior: hide guest name when logged in
  guestFields.style.display = currentUser ? "none" : "";

  // submit handler
  form.addEventListener("submit", onSubmitComment);
}

async function refreshAuthState() {
  try {
    const data = await api.whoami();
    currentUser = data.user || null;
    if (currentUser) {
      els.myPostsLink.classList.remove("hidden");
      els.loginLink.classList.add("hidden");
      els.registerLink.classList.add("hidden");
      els.logoutLink.classList.remove("hidden");
      els.apiStatus.textContent = `Signed in as ${currentUser.username}`;
    } else {
      els.myPostsLink.classList.add("hidden");
      els.loginLink.classList.remove("hidden");
      els.registerLink.classList.remove("hidden");
      els.logoutLink.classList.add("hidden");
      els.apiStatus.textContent = getToken()
        ? "Token set, but not valid"
        : "Not signed in";
    }
  } catch {
    els.myPostsLink.classList.add("hidden");
    els.loginLink.classList.remove("hidden");
    els.registerLink.classList.remove("hidden");
    els.logoutLink.classList.add("hidden");
    els.apiStatus.textContent = "API unreachable";
  }
}

async function loadPost() {
  try {
    const p = await api.posts.getOne(postUid);
    currentPost = p;
    // title/content safe render (avoid innerHTML)
    postTitle.textContent = p.title || "(untitled)";
    const authorName = p.author?.username ?? "unknown";
    const created = p.createdAt ? new Date(p.createdAt).toLocaleString() : "";
    postMeta.textContent = `By ${authorName} ${created ? "• " + created : ""}`;
    postContent.textContent = p.content || "";
  } catch (e) {
    renderNotFound(e.message || "Post not found");
  }
}

async function loadComments() {
  commentList.innerHTML = "";
  let comments = [];
  try {
    comments = await api.posts.commentsFor(postUid);
  } catch (e) {
    commentList.innerHTML = `<li><p class="error">Failed to load comments: ${e.message}</p></li>`;
    return;
  }

  for (const c of comments) {
    commentList.appendChild(renderCommentItem(c));
  }
}

function renderCommentItem(c) {
  const li = document.createElement("li");
  li.className = "comment-card";

  const head = document.createElement("div");
  head.className = "comment-head";
  const who = c.author?.username || c.displayName || "Anonymous";
  const when = c.createdAt ? new Date(c.createdAt).toLocaleString() : "";
  head.textContent = `${who} • ${when}`;

  const text = document.createElement("p");
  text.className = "comment-body";
  text.textContent = c.content || "";

  // action buttons based on permissions
  const actions = document.createElement("div");
  actions.className = "comment-actions";

  const canDelete =
    currentUser &&
    (currentUser.uid === c.author?.uid || // your own comment
      currentUser.uid === currentPost?.author?.uid); // you authored the post

  const canEdit = currentUser && currentUser.uid === c.author?.uid;

  if (canEdit) {
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEditComment(c, li, text));
    actions.appendChild(editBtn);
  }

  if (canDelete) {
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async () => {
      if (!confirm("Delete this comment?")) return;
      try {
        await api.posts.deleteComment(postUid, c.uid);
        await loadComments();
      } catch (e) {
        alert(e.message || "Delete failed");
      }
    });
    actions.appendChild(delBtn);
  }

  li.appendChild(head);
  li.appendChild(text);
  if (actions.childElementCount) li.appendChild(actions);
  return li;
}

function startEditComment(c, li, textEl) {
  // replace text with textarea + save/cancel
  const ta = document.createElement("textarea");
  ta.rows = 3;
  ta.value = c.content || "";
  ta.className = "comment-edit";
  li.replaceChild(ta, textEl);

  const actions =
    li.querySelector(".comment-actions") || document.createElement("div");
  actions.className = "comment-actions";
  actions.innerHTML = "";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    const content = ta.value.trim();
    if (!content) return alert("Content required");
    try {
      await api.posts.editComment(postUid, c.uid, content);
      await loadComments();
    } catch (e) {
      alert(e.message || "Update failed");
    }
  });

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => loadComments());

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  li.appendChild(actions);
}

async function onSubmitComment(e) {
  e.preventDefault();
  err.textContent = "";

  const fd = new FormData(form);
  const body = {
    content: (fd.get("content") || "").toString().trim(),
  };
  if (!currentUser) {
    const dn = (fd.get("displayName") || "").toString().trim();
    if (dn) body.displayName = dn;
  }
  if (!body.content) {
    err.textContent = "Comment content is required.";
    return;
  }

  try {
    await api.posts.addComment(postUid, body);
    form.reset();
    await loadComments();
  } catch (e) {
    err.textContent = e.message || "Failed to post comment";
  }
}

function renderNotFound(message) {
  document.querySelector("main.container").innerHTML = `<p class="error">${
    message || "Not found"
  }</p>`;
}
