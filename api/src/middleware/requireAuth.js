import { verifyJwt } from "../utils/jwt.js";
import { prisma } from "../db/prisma.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ error: "Missing or invalid Authorization header" });
    }

    const decoded = verifyJwt(token); // throws if invalid/expired
    // decoded.sub will be our user's uid
    const user = await prisma.user.findUnique({
      where: { uid: decoded.sub },
      select: { id: true, uid: true, email: true, username: true },
    });
    if (!user) return res.status(401).json({ error: "User no longer exists" });

    req.user = user; // attach for downstream handlers
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
