# Shohojog Server

Community-driven social development event platform - Backend API.

## Tech
- Express.js
- MongoDB + Mongoose
- JSON Web Token (JWT)

## API Routes
- `GET /` - Server running check
- `POST /api/auth/token` - Get JWT by email
- `GET /api/events` - All upcoming events (search + type filter)
- `GET /api/events/recent` - Recent 6 upcoming events
- `GET /api/events/my/:email` - My created events (JWT)
- `GET /api/events/:id` - Single event details
- `POST /api/events` - Create event (JWT)
- `PUT /api/events/:id` - Update own event (JWT)
- `DELETE /api/events/:id` - Delete own event (JWT)
- `POST /api/joined` - Join event (JWT)
- `GET /api/joined/:email` - My joined events (JWT)
- `GET /api/joined/count/:eventId` - Joined count + volunteers
- `DELETE /api/joined/:eventId` - Leave event (JWT)


## API Endpoints
- GET /api/events - All upcoming events
- GET /api/events/recent - Recent 6 events
- POST /api/events - Create event (JWT)
- PUT /api/events/:id - Update event (JWT)
- DELETE /api/events/:id - Delete event (JWT)
- POST /api/joined - Join event (JWT)
- GET /api/joined/:email - My joined events (JWT)


## Run Locally
```bash
npm install
npm run dev