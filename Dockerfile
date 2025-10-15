# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm" \
    PNPM_STORE_PATH="/pnpm/store" \
    NEXT_TELEMETRY_DISABLED="1" \
    PATH="${PNPM_HOME}:${PATH}"

WORKDIR /app

RUN apk add --no-cache libc6-compat \
  && mkdir -p "${PNPM_HOME}" "${PNPM_STORE_PATH}" \
  && corepack enable pnpm

FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN pnpm fetch --prod false

FROM base AS builder

COPY --from=deps ${PNPM_STORE_PATH} ${PNPM_STORE_PATH}
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prefer-offline

COPY . .

RUN pnpm build

FROM node:20-alpine AS runner

ENV PNPM_HOME="/pnpm" \
    PNPM_STORE_PATH="/pnpm/store" \
    NEXT_TELEMETRY_DISABLED="1" \
    NODE_ENV="production" \
    PATH="${PNPM_HOME}:${PATH}" \
    PORT="3000" \
    HOST="0.0.0.0"

WORKDIR /app

RUN apk add --no-cache libc6-compat \
  && mkdir -p "${PNPM_HOME}" "${PNPM_STORE_PATH}" \
  && corepack enable pnpm \
  && addgroup -S nextjs \
  && adduser -S nextjs -G nextjs

COPY --from=builder ${PNPM_STORE_PATH} ${PNPM_STORE_PATH}
COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod --prefer-offline

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

USER nextjs

EXPOSE 3000

CMD ["pnpm", "start"]
