FROM node:18 as base
WORKDIR /app
COPY package.json ./
COPY tsconfig-backend.json ./
COPY tsconfig-frontend.json ./
COPY .env ./
COPY src/ ./src/
COPY favicon.png ./
COPY config.json ./
RUN npm install

FROM base as production
ENV NODE_PATH=./build
RUN npm run build