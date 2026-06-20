FROM node:24-alpine AS build
WORKDIR /srv/app

# Install all dependencies (incl. dev) so we can build the TypeScript sources
COPY package.json package-lock.json ./
RUN npm ci

# Build the distributable output
COPY . .
RUN npm run build

FROM node:24-alpine
LABEL version="2.0" maintainer="Espen Hovlandsdal <espen@sanity.io>"
WORKDIR /srv/app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the built output from the build stage
COPY --from=build /srv/app/dist ./dist

CMD [ "node", "dist/cf-updater.js" ]
