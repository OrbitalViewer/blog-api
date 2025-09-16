import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// health check endpoint
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default app;
