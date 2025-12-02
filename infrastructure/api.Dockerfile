FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/api/prisma ./prisma

RUN corepack enable \
    && corepack prepare pnpm@10.19.0 --activate

RUN pnpm install --filter @propad/api... --frozen-lockfile=false
RUN pnpm --filter @propad/api... run prisma:generate
RUN pnpm --filter @propad/api... run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

RUN corepack enable \
    && corepack prepare pnpm@10.19.0 --activate

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/prisma ./prisma

RUN pnpm install --filter @propad/api... --frozen-lockfile=false
RUN pnpm --filter @propad/api... run prisma:generate

COPY --from=builder /app/apps/api/dist ./apps/api/dist
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
