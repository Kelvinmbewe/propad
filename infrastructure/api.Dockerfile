ARG NODE_IMAGE=node:20.11.1-slim

############################
# Builder stage
############################
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

# REQUIRED FOR PRISMA (schema + query engine) + SDK build
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    git \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV PRISMA_SKIP_AUTOINSTALL=true

COPY package*.json pnpm-workspace.yaml tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN npm install -g pnpm@10.19.0

RUN pnpm config set fetch-retries 5 \
    && pnpm config set fetch-retry-mintimeout 20000 \
    && pnpm config set fetch-retry-maxtimeout 120000

# Install ALL dependencies for building
RUN pnpm install --frozen-lockfile=false

# Build internal packages
RUN pnpm --filter @propad/config run build
RUN pnpm --filter @propad/sdk run build

# Generate Prisma Client and build API
RUN pnpm --filter @propad/api run prisma:generate
RUN pnpm --filter @propad/api run build

############################
# Runtime stage
############################
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production

# REQUIRED FOR PRISMA AT RUNTIME
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy EVERYTHING from builder to ensure exact same environment
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/src ./apps/api/src
COPY apps/api/start.sh ./apps/api/start.sh

RUN chmod +x ./apps/api/start.sh

EXPOSE 3001
CMD ["./apps/api/start.sh"]
