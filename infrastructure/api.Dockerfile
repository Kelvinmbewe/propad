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
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
ENV NODE_OPTIONS=--max-old-space-size=4096

COPY package*.json pnpm-workspace.yaml tsconfig.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN npm install -g pnpm@10.19.0

# Configure pnpm for network stability (EOF fix)
RUN pnpm config set store-dir /pnpm-store \
    && pnpm config set network-concurrency 1 \
    && pnpm config set fetch-retries 5 \
    && pnpm config set fetch-timeout 60000 \
    && pnpm config set child-concurrency 1

# Install ALL dependencies for building
RUN pnpm install --frozen-lockfile=false --prefer-offline

# Build all packages and apps
RUN pnpm --filter @propad/config run build
RUN pnpm --filter @propad/sdk run build
RUN pnpm --filter @propad/api run prisma:generate
RUN pnpm --filter @propad/api run build

############################
# Production stage
############################
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production

# REQUIRED FOR PRISMA AT RUNTIME
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10.19.0

# Configure pnpm for network stability (EOF fix)
RUN pnpm config set store-dir /pnpm-store \
    && pnpm config set network-concurrency 1 \
    && pnpm config set fetch-retries 5 \
    && pnpm config set fetch-timeout 60000 \
    && pnpm config set child-concurrency 1

# Copy only what is needed for production installation
COPY package*.json pnpm-workspace.yaml ./
COPY packages/config/package.json ./packages/config/package.json
COPY packages/sdk/package.json ./packages/sdk/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/api/prisma ./apps/api/prisma

# Install production dependencies only
# We use --no-frozen-lockfile because we are only copying some package.json files
RUN pnpm install --prod --no-frozen-lockfile --prefer-offline

# Copy build artifacts from builder
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Generate Prisma Client in the final environment
# This ensures it is placed correctly and matches the OS
# Install Prisma globally to allow generation without devDependencies
RUN npm install -g prisma@5.22.0
RUN prisma generate --schema=apps/api/prisma/schema.prisma

COPY apps/api/start.sh ./apps/api/start.sh
RUN chmod +x ./apps/api/start.sh

EXPOSE 3001
CMD ["./apps/api/start.sh"]
