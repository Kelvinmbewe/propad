ARG NODE_IMAGE=node:20.11.1-slim
FROM ${NODE_IMAGE} AS builder
RUN apt-get update && apt-get install -y \
  openssl \
  git \
  ca-certificates \
  curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
ENV NEXTAUTH_URL=http://localhost:3000

COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN npm install -g pnpm@10.19.0

# Environment variables for build stability
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
ENV NODE_OPTIONS=--max-old-space-size=4096

# Configure pnpm for network stability (EOF fix)
RUN pnpm config set store-dir /pnpm-store \
  && pnpm config set network-concurrency 1 \
  && pnpm config set fetch-retries 5 \
  && pnpm config set fetch-timeout 60000 \
  && pnpm config set fetch-retry-mintimeout 20000 \
  && pnpm config set fetch-retry-maxtimeout 120000 \
  && pnpm config set child-concurrency 1

RUN pnpm install --recursive --frozen-lockfile=false --prefer-offline

RUN pnpm --filter @propad/web... run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXTAUTH_URL=http://localhost:3000

RUN apt-get update && apt-get install -y \
  curl \
  openssl \
  git \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.19.0

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
EXPOSE 3000
CMD ["pnpm", "--filter", "@propad/web", "run", "start"]
