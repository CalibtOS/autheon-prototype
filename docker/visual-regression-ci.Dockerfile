ARG BASE_IMAGE=node:24-bookworm-slim
FROM ${BASE_IMAGE}

WORKDIR /app

ENV CI=true \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    VISUAL_REGRESSION_ARTIFACT_DIR=/app/visual-regression-artifacts

COPY package.json package-lock.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium

COPY . .

CMD ["node", "scripts/docker-visual-regression-ci-entrypoint.mjs"]
