import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { PostCreateSchema, PostUpdateSchema } from "../validation/schemas.js";

const router = Router();
router.use(optionalAuth);

// GET /posts — list posts (public)
router.get("/", async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: {
        uid: true,
        title: true,
        published: true,
        createdAt: true,
        author: { select: { uid: true, username: true } }, // <- relation inside select
        // optional: counts too
        // _count: { select: { comments: true } },
      },
    });
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// POST /posts - create post (authenticated)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { title, content, published } = PostCreateSchema.parse(req.body);

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
    if (err.name === "ZodError") {
      return res
        .status(400)
        .json({ error: "Invalid input", issues: err.issues });
    }
    next(err);
  }
});

// GET /posts/mine — list all posts by current user (published + unpublished)
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: { authorId: req.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        uid: true,
        title: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      }, // optional
    });
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// PATCH /posts/:uid — author-only edit
router.patch("/:uid", requireAuth, async (req, res, next) => {
  try {
    const { uid } = req.params;

    // 1) find the post and author
    const post = await prisma.post.findUnique({
      where: { uid },
      select: { id: true, authorId: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    // 2) ownership check
    if (post.authorId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // 3) sanitize input
    const data = PostUpdateSchema.parse(req.body);

    // 4) update
    const updated = await prisma.post.update({
      where: { id: post.id }, // use internal id after ownership check
      data,
      select: {
        uid: true,
        title: true,
        content: true,
        published: true,
        updatedAt: true,
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

// DELETE /posts/:uid — author-only delete
router.delete("/:uid", requireAuth, async (req, res, next) => {
  try {
    const { uid } = req.params;

    // 1) find the post and author
    const post = await prisma.post.findUnique({
      where: { uid },
      select: { id: true, authorId: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    // 2) ownership check
    if (post.authorId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // 3) delete in a transaction — clean comments first to avoid FK issues
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { postId: post.id } }),
      prisma.post.delete({ where: { id: post.id } }),
    ]);

    // 4) no body for a successful delete
    res.status(204).end();
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
        author: { select: { uid: true, username: true } },
        _count: { select: { comments: true } },
      },
    });

    if (!post || (!post.published && req.user?.id !== post.authorId)) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    next(err);
  }
});

export default router;
