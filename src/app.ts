import express, { Application, Request, Response } from "express";
import config from "./config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./modules/utils/globalErrorHandler";
import { authRouter } from "./modules/auth/auth.route";
import { planRouter } from "./modules/plan/plan.route";

const app: Application = express();

console.log("CORS origin:", config.app_url);

app.use(
  cors({
    origin: config.app_url,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("hello world");
});

app.use("/api/auth", authRouter);
app.use("/api/plans", planRouter);

app.use(globalErrorHandler);

export default app;
