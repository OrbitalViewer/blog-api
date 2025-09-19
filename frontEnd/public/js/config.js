export function getApiBase() {
  return localStorage.getItem("API_BASE") || "http://localhost:3000";
}
export function setApiBase(url) {
  localStorage.setItem("API_BASE", url);
}
export function getToken() {
  return localStorage.getItem("JWT") || null;
}
export function setToken(jwt) {
  if (jwt) localStorage.setItem("JWT", jwt);
  else localStorage.removeItem("JWT");
}
