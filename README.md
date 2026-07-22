# Library Server

A REST API for managing a book library and users, with JWT authentication.

---

## Setup

Install dependencies:

```bash
npm install
```

---

## Environment

The server reads the following environment variables:

- `PORT` for the API port
- `MONGO_URI` for the MongoDB connection string
- `JWT_SECRET` for signing access tokens
- `JWT_REFRESH_SECRET` for signing refresh tokens
- `JWT_ACCESS_TTL` for the access token lifetime
- `JWT_REFRESH_TTL` for the refresh token lifetime

If those variables are not set, the app falls back to `http://localhost:3000` and `librarydb`.

Create a `.env` file in the root of the project:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/librarydb
JWT_SECRET=your_long_random_string
JWT_REFRESH_SECRET=another_long_random_string
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
```

Generate secure secrets with:

```bash
openssl rand -hex 64
```

---

## Scripts

Start the server:

```bash
node index.js
```

---

## Project Structure

```
library-server/
├── server.js       # Entry point and routes - Refresh and logout token logic
├── db.js           # MongoDB connection
├── .env            # Environment variables (do not commit)
├── .env.example    # Environment variable template
└── package.json
```

---

## Authentication

The server uses two JWT tokens:

- `accessToken` — short-lived (15 min), sent in every request header
- `refreshToken` — long-lived (30 days), stored in MongoDB, used to renew the access token

### Flow

```
POST /Users/login     →  receive accessToken + refreshToken
POST /Users/refresh   →  receive a new accessToken
POST /Users/logout    →  refreshToken revoked from DB
```

---

## Endpoints

### Users

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/Users/register` | — | Register a new user |
| `POST` | `/Users/login` | — | Login, returns both tokens |
| `POST` | `/Users/refresh` | — | Get a new access token |
| `POST` | `/Users/logout` | ✅ | Logout, revokes refresh token |
| `GET` | `/Users` | ✅ Admin | Get all users |
| `GET` | `/Users/:code` | ✅ | Get a user by code |
| `PUT` | `/Users/:code` | ✅ Admin | Update a user |
| `DELETE` | `/Users/:code` | ✅ Admin | Delete a user |

### Library

| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/Library` | ✅ | Search books (filters: `title`, `author`, `genre`) |
| `POST` | `/Library` | ✅ Admin | Add a book |
| `PUT` | `/Library/:code` | ✅ Admin | Update a book |
| `DELETE` | `/Library/:code` | ✅ Admin | Delete a book |

---

## Request Examples

### Register

```http
POST /Users/register
Content-Type: application/json

{
  "name": "Mario Rossi",
  "email": "mario@email.com",
  "passwd": "password123",
  "admin": false
}
```

### Login

```http
POST /Users/login
Content-Type: application/json

{
  "email": "mario@email.com",
  "passwd": "password123"
}
```

Response:

```json
{
  "success": true,
  "token": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

### Protected route

```http
GET /Library?title=Dune&author=Herbert
Authorization: Bearer eyJhbGci...
```

### Refresh token

```http
POST /Users/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGci..."
}
```

---

## Database Collections

### `users`

```json
{
  "_id": 1,
  "name": "Mario Rossi",
  "email": "mario@email.com",
  "passwd": "$2b$12$...",
  "admin": false
}
```

### `books`

```json
{
  "_id": { "$oid": "..." },
  "code": 4,
  "title": "Fahrenheit 451",
  "author": "Ray Bradbury",
  "year": 1953,
  "genre": "Distopico",
  "isbn": "9781451673319",
  "description": "..."
}
```

### `refreshTokens`

```json
{
  "token": "eyJhbGci...",
  "userId": "123",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## Security Notes

- Passwords are hashed with **bcrypt** (12 salt rounds)
- Refresh tokens are stored in MongoDB and deleted on logout
- Never commit your `.env` file
- Use secrets generated with `openssl rand -hex 64` in production

---

## Related

- [library-client](https://github.com/Serafin-sudo/Project-Work) — Frontend interface

---

## License

MIT

