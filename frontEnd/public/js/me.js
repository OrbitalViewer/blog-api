import { api } from "./api.js";

const els = {
  list: document.getElementById("my-posts"),
  newBtn: document.getElementById("new-post"),
  editor: document.getElementById("editor"),
  form: document.getElementById("post-form"),
  cancel: document.getElementById("cancel-edit"),
  error: document.getElementById("post-error"),
  editorTitle: document.getElementById("editor-title"),
};

let editingUid = null;

init();

function init() {
  els.newBtn.addEventListener("click", () => openEditor());
  els.cancel.addEventListener("click", closeEditor);
  els.form.addEventListener("submit", onSave);

  loadMyPosts();
}

async function loadMyPosts() {
  els.list.innerHTML = "";
  let posts = [];
  try {
    posts = await api.posts.mine();
  } catch (e) {
    els.list.innerHTML = `<li><p class="error">${e.message}</p></li>`;
    return;
  }

  for (const p of posts) {
    const li = document.createElement("li");
    li.className = "post-card";

    const title = document.createElement("h3");
    title.textContent = p.title || "(untitled)";

    const meta = document.createElement("div");
    meta.className = "post-meta";
    meta.textContent = p.published ? "Published" : "Draft";

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.onclick = () => openEditor(p);
    actions.appendChild(editBtn);

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = p.published ? "Unpublish" : "Publish";
    toggleBtn.onclick = async () => {
      try {
        await api.posts.update(p.uid, { published: !p.published });
        loadMyPosts();
      } catch (e) {
        alert(e.message);
      }
    };
    actions.appendChild(toggleBtn);

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.onclick = async () => {
      if (!confirm("Delete this post?")) return;
      try {
        await api.posts.delete(p.uid);
        loadMyPosts();
      } catch (e) {
        alert(e.message);
      }
    };
    actions.appendChild(delBtn);

    li.appendChild(title);
    li.appendChild(meta);
    li.appendChild(actions);
    els.list.appendChild(li);
  }
}

async function openEditor(post = null) {
  editingUid = post ? post.uid : null;
  els.editorTitle.textContent = post ? "Edit Post" : "New Post";

  let full = null;
  if (post) {
    try {
      full = await api.posts.getOne(post.uid); // fetch full post (includes content)
    } catch (e) {
      // fallback to what we have
      full = post;
    }
  }

  els.form.title.value = full?.title || "";
  els.form.content.value = full?.content || "";
  els.form.published.checked = !!full?.published;
  els.error.textContent = "";
  els.editor.classList.remove("hidden");
}

function closeEditor() {
  els.editor.classList.add("hidden");
  editingUid = null;
}

async function onSave(e) {
  e.preventDefault();
  els.error.textContent = "";

  const data = {
    title: els.form.title.value.trim(),
    content: els.form.content.value.trim(),
    published: els.form.published.checked,
  };

  try {
    if (editingUid) {
      await api.posts.update(editingUid, data);
    } else {
      await api.posts.create(data);
    }
    closeEditor();
    loadMyPosts();
  } catch (err) {
    els.error.textContent = err.message || "Save failed";
  }
}
