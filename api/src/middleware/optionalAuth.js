import { verifyJwt } from "../utils/jwt.js";
import { prisma } from "../db/prisma.js";

export async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme === "Bearer" && token) {
      const decoded = verifyJwt(token);
      const user = await prisma.user.findUnique({
        where: { uid: decoded.sub },
        select: { id: true, uid: true, email: true, username: true },
      });
      if (user) req.user = user;
    }
  } catch {
    // ignore token errors; keep route public
  }
  next();
}
