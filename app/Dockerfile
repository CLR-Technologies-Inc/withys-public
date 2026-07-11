# Stage 1: Build the Expo Web application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy lock files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application files
COPY . .

# Compile the Expo web export (generates files in /app/dist)
RUN npm run build

# Stage 2: Host the compiled static files using Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Write Nginx routing rules to support HTML5 history API (Expo Router SPA routes)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
