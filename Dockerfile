FROM node:18 as base
WORKDIR /app
COPY . .
RUN npm install

FROM base as production
ENV NODE_PATH=./build
RUN npm run build