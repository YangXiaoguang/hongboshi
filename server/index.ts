import "./db/loadEnv";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { registerAssessmentApi } from "./modules/assessments/assessmentApi";
import { registerAuthApi } from "./modules/auth/authSessionApi";
import { registerCounselingApi } from "./modules/counseling/counselingApi";
import { registerCourseAccessApi } from "./modules/courses/courseAccessApi";
import { registerCourseApi } from "./modules/courses/courseApi";
import { registerGrowthProfileApi } from "./modules/growth/growthProfileApi";
import { registerPaymentApi } from "./modules/payments/paymentApi";
import { assertPersistenceConfig } from "./db/runtimeConfig";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  assertPersistenceConfig();

  const app = express();
  const server = createServer(app);

  app.use(express.json());
  registerAuthApi(app);
  registerAssessmentApi(app);
  registerCounselingApi(app);
  registerCourseAccessApi(app);
  registerCourseApi(app);
  registerGrowthProfileApi(app);
  registerPaymentApi(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
