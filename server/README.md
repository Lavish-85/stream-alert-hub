
# Donation Alerts WebSocket Server

This is a custom WebSocket server for handling donation alerts in real-time. It provides a more reliable alternative to Supabase edge functions for delivering real-time alerts.

## Features

- Real-time WebSocket connections for alert delivery
- Channel-based subscriptions (by user ID)
- JWT authentication for secure connections
- Heartbeat mechanism to maintain connections
- Automatic reconnection on client side
- REST API endpoint for sending alerts

## Setup

### Requirements

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
   ```
   npm install
   ```

2. Set environment variables:
   - `PORT`: The port to run the server on (default: 8080)
   - `JWT_SECRET`: Secret key for JWT authentication

### Running the server

Development mode:
```
npm run dev
```

Production mode:
```
npm start
```

## Deployment

The server can be deployed to platforms like:

- Railway.app
- Render.com
- Heroku
- Any VPS or cloud provider

Make sure to set the environment variables in your deployment environment.

## Client Integration

Clients connect to the WebSocket server using the URL format:
```
wss://your-server-url/alerts/{channelId}?token={authToken}
```

The `token` query parameter is optional for public channels but required for authenticated operations.

## API Documentation

### WebSocket Events

**Connection Confirmation**
```json
{
  "type": "system",
  "message": "Connected to alert service",
  "channelId": "user-id-123",
  "userId": "user-id-123"
}
```

**Heartbeat Request**
```json
{
  "type": "heartbeat"
}
```

**Heartbeat Response**
```json
{
  "type": "heartbeat",
  "timestamp": 1621234567890
}
```

**Alert Message**
```json
{
  "type": "alert",
  "alertType": "donation",
  "data": {
    "donor_name": "John Doe",
    "amount": 100,
    "message": "Great stream!"
  }
}
```

### REST API Endpoints

**Send Alert**
```
POST /api/send-alert
```

Request body:
```json
{
  "channelId": "user-id-123",
  "alertData": {
    "type": "donation",
    "donor_name": "John Doe",
    "amount": 100,
    "message": "Great stream!"
  },
  "token": "server-api-key"
}
```

Response:
```json
{
  "success": true
}
```
