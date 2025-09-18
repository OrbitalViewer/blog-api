// src/validation/schemas.js
import { z } from "zod";

// Posts
export const PostCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
  published: z.boolean().optional().default(false),
});

export const PostUpdateSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    content: z.string().trim().min(1).optional(),
    published: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// Comments
export const CommentCreateSchema = z.object({
  content: z.string().trim().min(1, "Content is required"),
  // For anonymous comments; if user is logged in we'll ignore this
  displayName: z.string().trim().min(1).optional(),
});

export const CommentUpdateSchema = z.object({
  // Only comment content can be edited
  content: z.string().trim().min(1, "Content is required"),
});
