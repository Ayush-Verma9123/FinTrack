# FinTrack

FinTrack is a full-stack personal finance dashboard for recording income, expenses, savings, investments, and financial goals. It is designed to be clear and comfortable for customers of all ages, with a responsive layout for desktop and mobile.

## Included

- Account creation and sign-in with hashed passwords and JWT sessions
- MongoDB-backed, per-user finance entries
- Dashboard totals for available money, income, expenses, savings, and investments
- Spending-by-category overview
- Savings and financial goals
- Add, edit, filter, and delete transactions
- Responsive navigation and accessible form controls

## Tech Stack

- Frontend: React and Vite
- Backend: Express
- Database: MongoDB (local installation or MongoDB Atlas)
- Authentication: bcryptjs and JSON Web Tokens

## Run Locally

1. Set up MongoDB using one of these options:

   - Local MongoDB Community Server: install it and make sure the MongoDB service is running.
   - MongoDB Atlas: create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), create a database user, allow your current IP address under Network Access, then copy the Node.js connection string.

2. Create `.env` from `.env.example`, then set your MongoDB connection string and a long, private JWT secret.

   ```env
   # Local MongoDB
   MONGODB_URI=mongodb://127.0.0.1:27017

   # Or MongoDB Atlas
   # MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority

   MONGODB_DB_NAME=fintrack
   JWT_SECRET=replace_with_a_long_random_secret
   CLIENT_URL=http://localhost:5173
   VITE_API_URL=http://localhost:3001/api
   ```

3. Install dependencies and start the frontend and API together:

   ```bash
   npm install
   npm run dev
   ```

4. Open `http://localhost:5173`, create an account, and add transactions. MongoDB creates the `fintrack` database, collections, and indexes automatically on first use.

## Separate Commands

```bash
npm run client  # React client at http://localhost:5173
npm run server  # Express API at http://localhost:3001
npm run build   # Production frontend build
```

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/me` | Read signed-in user |
| GET, POST | `/api/entries` | List or add transactions |
| PUT, DELETE | `/api/entries/:id` | Update or delete a transaction |
| GET | `/api/dashboard` | Read dashboard totals and spending data |
| GET, POST | `/api/goals` | List or create financial goals |
| DELETE | `/api/goals/:id` | Delete a goal |

Authenticated endpoints require an `Authorization: Bearer <token>` header. The browser application handles this automatically.
