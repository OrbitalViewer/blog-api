import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { signJwt } from "../utils/jwt.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// POST /auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, username } = registerSchema.parse(req.body);

    // unique email check
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 12); // cost factor 12 is a solid default

    const user = await prisma.user.create({
      data: { email, username: username ?? null, passwordHash },
      select: { uid: true, email: true, username: true },
    });

    const token = signJwt({ sub: user.uid });
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Invalid input", issues: err.issues });
    }
    next(err);
  }
});

// POST /auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const publicUser = {
      uid: user.uid,
      email: user.email,
      username: user.username,
    };
    const token = signJwt({ sub: user.uid });
    res.json({ token, user: publicUser });
  } catch (err) {
    if (err.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Invalid input", issues: err.issues });
    }
    next(err);
  }
});

// GET /auth/me — verify token and return current user
router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
