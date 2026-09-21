FROM node:20-alpine

WORKDIR /app

# Copy package definition
COPY package.json ./

# Copy all project files
COPY . .

# Expose default port
ENV PORT=8080
EXPOSE 8080

# Start production server
CMD ["node", "server.js"]
