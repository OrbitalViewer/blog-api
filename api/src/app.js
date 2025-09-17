import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import postsRouter from "./routes/posts.js";

const app = express();

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/posts", postsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

// health check endpoint
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default app;
