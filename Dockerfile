FROM node:22

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build the frontend
RUN cd frontend-vite && pnpm run build

# Expose port
EXPOSE 4173

# Start the frontend server
WORKDIR /app/frontend-vite
CMD ["node", "server.js"]