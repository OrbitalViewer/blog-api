// src/routes/comments.js
import { Router } from "express";
import { prisma } from "../db/prisma.js";

const router = Router({ mergeParams: true });

// GET /posts/:uid/comments — list comments newest first
router.get("/", async (req, res, next) => {
  try {
    const { uid } = req.params;

    const post = await prisma.post.findUnique({
      where: { uid },
      select: { id: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = await prisma.comment.findMany({
      where: { postId: post.id },
      orderBy: { createdAt: "desc" },
      select: {
        uid: true,
        content: true,
        displayName: true,
        createdAt: true,
        author: { select: { username: true, uid: true } }, // null if anonymous
      },
    });

    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// POST /posts/:uid/comments — create comment (anonymous allowed)
router.post("/", async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { content, displayName } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Content is required" });
    }

    const post = await prisma.post.findUnique({
      where: { uid },
      select: { id: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    // TODO: when auth exists, take user from req.user and set authorId
    const comment = await prisma.comment.create({
      data: {
        content,
        displayName: displayName?.trim() || null,
        postId: post.id,
        // authorId: req.user?.id ?? null
      },
      select: {
        uid: true,
        content: true,
        displayName: true,
        createdAt: true,
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

export default router;
