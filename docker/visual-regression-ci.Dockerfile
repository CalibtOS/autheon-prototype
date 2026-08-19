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

# Warm the third-party vendor cache into the image.
#
# The prototype pages load React, ReactDOM, Babel Standalone and pdf.js from
# unpkg.com at runtime (~5.5 MB per page load). Left uncached, a 53-test run makes
# 150+ CDN requests / ~290 MB of traffic and gets throttled partway through — the
# scripts then fail, React never mounts, and specs fail before reaching their
# screenshot assertion. Baking the cache in makes a run fully offline and
# deterministic. See tests/regression/support/fixtures/vendor-cache.ts.
#
# Deliberately AFTER `COPY . .`: the warmer and its pinned asset list are part of
# the repository, and the assets are immutable pinned versions, so this layer is
# only rebuilt when that list actually changes.
RUN node scripts/warm-vendor-cache.mjs

CMD ["node", "scripts/docker-visual-regression-ci-entrypoint.mjs"]
