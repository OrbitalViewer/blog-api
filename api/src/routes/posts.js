import { Router } from "express";
import { prisma } from "../db/prisma.js";

const router = Router();

// GET /posts — list posts (public)
router.get("/", async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      // select: { uid: true, title: true, published: true, createdAt: true }, // optional: limit fields
    });
    res.json(posts);
  } catch (err) {
    next(err);
  }
});
router.post("/", async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        // authorId will need to come from auth later
        authorId: 1, // temp: assume user 1 exists
      },
    });

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

export default router;
