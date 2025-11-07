FROM node:20-alpine AS builder
WORKDIR /repo

COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/api/prisma ./prisma

RUN corepack enable \
    && corepack prepare pnpm@10.19.0 --activate

RUN pnpm install --recursive --frozen-lockfile=false
RUN pnpm --filter @propad/api... run prisma:generate
RUN pnpm --filter @propad/api... run build

# produce a self-contained prod bundle for the API
RUN pnpm deploy --filter @propad/api --prod /out

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable \
    && corepack prepare pnpm@10.19.0 --activate

COPY --from=builder /out ./
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
