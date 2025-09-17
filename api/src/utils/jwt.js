import jwt from "jsonwebtoken";

const { JWT_SECRET, JWT_EXPIRES_IN = "7d" } = process.env;

export function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token) {
  return jwt.verify(token, JWT_SECRET);
}
