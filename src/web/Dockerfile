# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_* переменные запекаются в бандл во время сборки
ARG VITE_OIDC_AUTHORITY
ARG VITE_OIDC_CLIENT_ID
ARG VITE_OIDC_REDIRECT_URI
ARG VITE_LIVEKIT_URL
ARG VITE_USE_AUTH_MOCK=false
ARG VITE_API_URL=

RUN npm run build

# ---- Runtime stage ----
FROM nginx:1.30-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
