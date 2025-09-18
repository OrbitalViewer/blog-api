// src/routes/comments.js
import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import {
  CommentCreateSchema,
  CommentUpdateSchema,
} from "../validation/schemas.js";

const router = Router({ mergeParams: true });
router.use(optionalAuth);

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
    const { content, displayName } = CommentCreateSchema.parse(req.body);

    const post = await prisma.post.findUnique({
      where: { uid },
      select: { id: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const authorId = req.user?.id ?? null;

    const comment = await prisma.comment.create({
      data: {
        content, // already trimmed by Zod
        displayName: authorId ? null : displayName ?? null,
        postId: post.id,
        authorId,
      },
      select: {
        uid: true,
        content: true,
        displayName: true,
        createdAt: true,
        author: { select: { uid: true, username: true } }, // null if anon
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    if (err.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Invalid input", issues: err.issues });
    }
    next(err);
  }
});

// PATCH /posts/:uid/comments/:cuid — only comment author can edit (content only)
router.patch("/:cuid", requireAuth, async (req, res, next) => {
  try {
    const { uid: postUid, cuid: commentUid } = req.params;

    // 1) Load the comment (author + owning postId)
    const comment = await prisma.comment.findUnique({
      where: { uid: commentUid },
      select: { id: true, authorId: true, postId: true },
    });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    // 2) Ensure the URL's post matches the comment's post (prevents cross-post edits)
    const post = await prisma.post.findUnique({
      where: { uid: postUid },
      select: { id: true },
    });
    if (!post || comment.postId !== post.id) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // 3) Authz: only the comment author may edit
    if (comment.authorId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // 4) Validate input (content only) via Zod
    const { content } = CommentUpdateSchema.parse(req.body);

    // 5) Update
    const updated = await prisma.comment.update({
      where: { id: comment.id },
      data: { content },
      select: {
        uid: true,
        content: true,
        createdAt: true,
        author: { select: { uid: true, username: true } }, // null if anon, but anon can't edit anyway
        displayName: true, // harmless to return; will be null on logged-in comments
      },
    });

    res.json(updated);
  } catch (err) {
    if (err.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Invalid input", issues: err.issues });
    }
    next(err);
  }
});

// DELETE /posts/:uid/comments/:cuid — comment author OR post author can delete
router.delete("/:cuid", requireAuth, async (req, res, next) => {
  try {
    const { uid: postUid, cuid: commentUid } = req.params;

    // 1) load post (to get internal id and post author)
    const post = await prisma.post.findUnique({
      where: { uid: postUid },
      select: { id: true, authorId: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    // 2) load comment (validate it belongs to that post)
    const comment = await prisma.comment.findUnique({
      where: { uid: commentUid },
      select: { id: true, authorId: true, postId: true },
    });
    if (!comment || comment.postId !== post.id) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // 3) authorization: comment author OR post author
    const isCommentAuthor =
      comment.authorId != null && comment.authorId === req.user.id;
    const isPostAuthor = post.authorId === req.user.id;
    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // 4) delete; return no content
    await prisma.comment.delete({ where: { id: comment.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
