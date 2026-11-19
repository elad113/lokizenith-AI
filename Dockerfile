# Production image for Cloud Run (lokizenith.com)
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json .npmrc ./
RUN npm install --include=dev --no-audit --no-fund
COPY . .
RUN npm run build
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.ts"]
