// middleware imports
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// router imports
import postsRouter from "./routes/posts.js";
import commentsRouter from "./routes/comments.js";
import authRouter from "./routes/auth.js";

const app = express();

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// routers
app.use("/auth", authRouter);
app.use("/posts", postsRouter);
app.use("/posts/:uid/comments", commentsRouter);

// error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

// health check endpoint
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default app;
