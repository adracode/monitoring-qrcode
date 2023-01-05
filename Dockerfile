FROM node:12 as base
WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
COPY .env ./
COPY src/ ./src/
RUN npm install

FROM base as production
ENV NODE_PATH=./build
RUN npm run build