// frontEnd/public/js/register.js
import { api } from "./api.js";
import { setToken } from "./config.js";

const form = document.getElementById("register-form");
const err = document.getElementById("register-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  err.textContent = "";
  const data = new FormData(form);
  const username = data.get("username").trim();
  const email = data.get("email").trim();
  const password = data.get("password");

  if (!username || !email || !password) {
    err.textContent = "All fields are required.";
    return;
  }

  try {
    // Expecting response like: { token, user: { uid, email, username } }
    const res = await api.auth.register(username, email, password);
    if (!res.token) throw new Error("No token returned");
    setToken(res.token);

    window.location.href = "/";
  } catch (e) {
    err.textContent = e.message || "Registration failed";
  }
});
