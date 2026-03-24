# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20.19.0

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable


# dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

#build
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build && pnpm prune --prod

#runtime
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=5000
ENV HEALTHCHECK_PATH=/api/v1/health

WORKDIR /app

RUN addgroup -S nodejs && adduser -S appuser -G nodejs

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "const http=require('http');const path=process.env.HEALTHCHECK_PATH;const port=process.env.PORT||5000;const req=http.get(`http://127.0.0.1:${port}${path}`,res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));req.setTimeout(4000,()=>{req.destroy();process.exit(1);});"

CMD ["node", "dist/server.js"]

