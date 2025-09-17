import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

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
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, content, published } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published: !!published,
        authorId: req.user.id,
      },
    });

    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

// GET /posts/:uid — fetch a single post by uid
router.get("/:uid", async (req, res, next) => {
  try {
    const { uid } = req.params;

    const post = await prisma.post.findUnique({
      where: { uid },
      include: {
        author: { select: { uid: true, username: true, email: true } },
        _count: { select: { comments: true } },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    next(err);
  }
});

export default router;
