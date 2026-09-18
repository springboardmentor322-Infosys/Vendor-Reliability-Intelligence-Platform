# Stage 1: Build Angular application
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Serve Angular application using Nginx
FROM nginx:alpine

COPY --from=build /app/dist/vendor-reliability-frontend/browC:\Users\kotte\OneDrive\Documents\vendor-reliability-frontend>ser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]