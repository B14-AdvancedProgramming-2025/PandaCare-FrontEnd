# Use an official Node.js runtime as a parent image
FROM node:18-alpine AS base

# Set the working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Use a smaller image for production
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line if you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=base /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static


# Expose port 3000 (Next.js default)
EXPOSE 3000

# Set the command to start the application
CMD ["node", "server.js"] 