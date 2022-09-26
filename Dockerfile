FROM alpine:3.11

USER root

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

ENV NODE_VERSION 14.16.1
ENV NPM_CONFIG_LOGLEVEL warn
ENV PORT 80

COPY . .

RUN apk add --update npm

RUN npx browserslist@latest --update-db

RUN npm run build

EXPOSE 80

CMD ["npm", "start"]