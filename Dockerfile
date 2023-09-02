FROM node:20-alpine
LABEL version="1.0" maintainer="Espen Hovlandsdal <espen@sanity.io>"

WORKDIR /srv/app

# Install app dependencies (pre-source copy in order to cache dependencies)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev

# Bundle app source
COPY . .

CMD [ "node", "src/cf-updater.js" ]
