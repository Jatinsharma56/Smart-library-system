# Smart Library Management System Backend

This is the backend for the Smart Library Management System, built with Node.js, Express, MongoDB, and JWT authentication.

## Prerequisites

- Node.js installed
- MongoDB installed and running locally, or a MongoDB Atlas URI.

## Installation & Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   A default `.env` is already provided. Ensure `MONGO_URI` points to a valid MongoDB database.

4. Run the server:
   ```bash
   # Development (nodemon)
   npm run dev

   # Production
   npm start
   ```

## APIs Structure

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`
- **Books**: `GET /api/books`, `POST /api/books` (Admin), `PUT /api/books/:id` (Admin), `DELETE /api/books/:id` (Admin), `GET /api/books/search?q=keyword`
- **Issue**: `POST /api/issue/issue` (Protected), `POST /api/issue/return` (Protected)
- **Fines**: `GET /api/fines/:userId` (Protected)

## Postman Testing

You can import `postman_collection.json` into Postman to easily test all the primary routes with examples.
