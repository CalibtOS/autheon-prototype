import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

for (const fileName of ['.env.testing', '.env.e2e', '.env']) {
  loadDotenv({
    path: path.resolve(process.cwd(), fileName),
    override: false,
  });
}

const LOCAL_DEV_PORT = Number(process.env.E2E_PORT || 4173);
const localBaseURL = `http://127.0.0.1:${LOCAL_DEV_PORT}`;

export const e2eEnv = {
  baseURL: process.env.E2E_BASE_URL || process.env.APP_BASE_URL || localBaseURL,
  localBaseURL,
  shouldStartWebServer: !process.env.E2E_BASE_URL && !process.env.APP_BASE_URL,
};

