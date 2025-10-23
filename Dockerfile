FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Copy built files from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/web-build ./web-build
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/app/payment-redirect.html ./app/payment-redirect.html

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 