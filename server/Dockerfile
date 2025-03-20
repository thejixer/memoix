# Use official Go image as the builder
FROM golang:1.23-alpine AS builder

# Set the working directory inside the container
WORKDIR /memoixserver

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the rest of the backend code
COPY . .

# Copy the docker.env file
COPY docker.env .env

# Build the Go binary, creating the output directory if needed
RUN mkdir -p /memoixserver/server && go build -o /memoixserver/server/server ./cmd

# Use a lightweight image for running the app
FROM alpine:latest

WORKDIR /memoixserver

# Install CA certificates (needed for HTTPS connections)
RUN apk add --no-cache ca-certificates curl

# Copy the compiled binary from the builder
COPY --from=builder /memoixserver/server/server /memoixserver/server

# Ensure the public directory exists
RUN mkdir -p /memoixserver/public

# Copy backend-specific environment file from the builder stage
COPY --from=builder /memoixserver/.env .env
RUN ls -al .env

# Expose the correct port
EXPOSE 4848

# Run the application
CMD ["./server"]