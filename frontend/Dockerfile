FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY public/manifest.json /usr/share/nginx/html/manifest.json
COPY public/sw.js /usr/share/nginx/html/sw.js
COPY public/icons /usr/share/nginx/html/icons
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
