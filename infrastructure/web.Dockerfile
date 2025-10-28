FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN corepack enable \
    && corepack prepare pnpm@10.19.0 --activate

RUN pnpm install --recursive --frozen-lockfile=false
RUN pnpm --filter @propad/web... run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable \
    && corepack prepare pnpm@10.19.0 --activate

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
EXPOSE 3000
CMD ["pnpm", "--filter", "@propad/web", "run", "start"]
