FROM node:20-alpine AS builder
WORKDIR /app
ENV PRISMA_SKIP_AUTOINSTALL=true

RUN apk add --no-cache openssl

COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/api/prisma ./prisma

RUN npm install -g pnpm@10.19.0

RUN pnpm config set fetch-retries 5 \
    && pnpm config set fetch-retry-mintimeout 20000 \
    && pnpm config set fetch-retry-maxtimeout 120000

RUN pnpm install --filter @propad/api... --frozen-lockfile=false
RUN pnpm --filter @propad/sdk run build
RUN pnpm --filter @propad/api... run prisma:generate
RUN pnpm --filter @propad/api... run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

RUN npm install -g pnpm@10.19.0

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

RUN pnpm install --filter @propad/api... --frozen-lockfile=false
RUN pnpm --filter @propad/api... run prisma:generate

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/start.sh ./apps/api/start.sh
RUN chmod +x ./apps/api/start.sh

EXPOSE 3001
CMD ["./apps/api/start.sh"]
