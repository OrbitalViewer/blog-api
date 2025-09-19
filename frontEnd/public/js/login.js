// frontEnd/public/js/login.js
import { api } from "./api.js";
import { setToken } from "./config.js";

const form = document.getElementById("login-form");
const err = document.getElementById("login-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = "";
  const data = new FormData(form);
  const email = data.get("email").trim();
  const password = data.get("password");

  if (!email || !password) {
    err.textContent = "Email and password are required.";
    return;
  }

  try {
    // Expecting response like: { token, user: { uid, email, username } }
    const res = await api.auth.login(email, password);
    if (!res.token) throw new Error("No token returned");
    setToken(res.token);

    // Go back home; index will call whoami and unhide "My Posts"
    window.location.href = "/";
  } catch (e) {
    err.textContent = e.message || "Login failed";
  }
});
