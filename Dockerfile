# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg poppler-utils tesseract-ocr tesseract-ocr-hin ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci
COPY . .
RUN npm run build -- --webpack && chown -R node:node /app
ENV NODE_ENV=production
ENV PDF_OCR_LANGUAGES=eng+hin
USER node
EXPOSE 3000
CMD ["node", "scripts/start-cloud.mjs"]
