ARG NODE_IMAGE=node:20.11.1-slim
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV PRISMA_SKIP_AUTOINSTALL=true
ENV NEXT_PUBLIC_API_BASE_URL=http://localhost:3001



COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/api/prisma ./apps/web/prisma

RUN npm install -g pnpm@10.19.0

RUN pnpm config set fetch-retries 5 \
    && pnpm config set fetch-retry-mintimeout 20000 \
    && pnpm config set fetch-retry-maxtimeout 120000

RUN pnpm install --recursive --frozen-lockfile=false

WORKDIR /app/apps/web
RUN pnpm exec prisma generate --schema ./prisma/schema.prisma
WORKDIR /app

RUN pnpm --filter @propad/web... run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production



RUN npm install -g pnpm@10.19.0

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
EXPOSE 3000
CMD ["pnpm", "--filter", "@propad/web", "run", "start"]
