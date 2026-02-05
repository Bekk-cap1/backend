FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ARG SHADOW_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ENV DATABASE_URL=$DATABASE_URL
ENV SHADOW_DATABASE_URL=$SHADOW_DATABASE_URL
ENV HUSKY=0
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY scripts ./scripts
RUN npm_config_ignore_scripts=true npm ci --omit=dev
RUN npm run prisma:generate

FROM base AS build
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ARG SHADOW_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
ENV DATABASE_URL=$DATABASE_URL
ENV SHADOW_DATABASE_URL=$SHADOW_DATABASE_URL
ENV HUSKY=0
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY scripts ./scripts
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
