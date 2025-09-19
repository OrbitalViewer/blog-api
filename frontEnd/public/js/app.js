import { getApiBase, setApiBase, getToken, setToken } from "./config.js";
import { api } from "./api.js";

const els = {
  myPostsLink: document.getElementById("my-posts-link"),
  loginLink: document.getElementById("login-link"),
  registerLink: document.getElementById("register-link"),
  logoutLink: document.getElementById("logout-link"), // NEW
  apiBase: document.getElementById("api-base"),
  saveApi: document.getElementById("save-api"),
  apiStatus: document.getElementById("api-status"),
  postList: document.getElementById("post-list"),
};

init();

async function init() {
  // API base input
  els.apiBase.value = getApiBase();
  els.saveApi.addEventListener("click", () => {
    const val = els.apiBase.value.trim();
    if (!val) return;
    setApiBase(val);
    els.apiStatus.textContent = "Saved. Reloading…";
    setTimeout(() => window.location.reload(), 300);
  });

  // Logout handler
  els.logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    setToken(null);
    window.location.reload();
  });

  // Auth state
  await refreshAuthState();

  // Load Home posts
  await loadHome();
}

async function refreshAuthState() {
  try {
    const data = await api.whoami();
    if (data.user) {
      els.myPostsLink.classList.remove("hidden");
      els.loginLink.classList.add("hidden");
      els.registerLink.classList.add("hidden");
      els.logoutLink.classList.remove("hidden"); // show logout
      els.apiStatus.textContent = `Signed in as ${data.user.username}`;
    } else {
      els.myPostsLink.classList.add("hidden");
      els.loginLink.classList.remove("hidden");
      els.registerLink.classList.remove("hidden");
      els.logoutLink.classList.add("hidden"); // hide logout
      els.apiStatus.textContent = getToken()
        ? "Token set, but not valid"
        : "Not signed in";
    }
  } catch (e) {
    els.myPostsLink.classList.add("hidden");
    els.loginLink.classList.remove("hidden");
    els.registerLink.classList.remove("hidden");
    els.logoutLink.classList.add("hidden");
    els.apiStatus.textContent = "API unreachable";
    console.error(e);
  }
}

async function loadHome() {
  els.postList.innerHTML = "";
  let posts;
  try {
    posts = await api.posts.listPublished();
  } catch (e) {
    els.postList.innerHTML = `<li class="post-card"><p class="error">Failed to load posts: ${e.message}</p></li>`;
    return;
  }

  // For each post, fetch comments and count them (simple N+1 for MVP)
  for (const p of posts) {
    let commentCount = 0;
    try {
      const comments = await api.posts.commentsFor(p.uid);
      commentCount = Array.isArray(comments) ? comments.length : 0;
    } catch (e) {
      // Ignore per-post comment fetch errors on Home (still render the card)
      console.warn("Comments fetch failed for", p.uid, e.message);
    }

    const li = document.createElement("li");
    li.className = "post-card";
    // IMPORTANT: use textContent to avoid XSS
    const title = document.createElement("a");
    title.href = `/pages/post.html?uid=${encodeURIComponent(p.uid)}`;
    title.textContent = p.title;

    const meta = document.createElement("div");
    meta.className = "post-meta";
    meta.textContent = `By ${
      p.author?.username ?? "unknown"
    } • ${commentCount} comment${commentCount === 1 ? "" : "s"}`;

    const excerpt = document.createElement("p");
    excerpt.textContent = (p.content || "").slice(0, 160);

    li.appendChild(title);
    li.appendChild(meta);
    li.appendChild(excerpt);
    els.postList.appendChild(li);
  }
}
