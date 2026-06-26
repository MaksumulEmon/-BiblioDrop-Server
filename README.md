<div align="center">

# 🚀 BiblioDrop Server

### Backend API for BiblioDrop - Online Book Delivery Management System

Powering the complete BiblioDrop ecosystem with secure authentication, role-based authorization, payment processing, and RESTful APIs.

<img src="https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js"/>
<img src="https://img.shields.io/badge/Express.js-5-black?style=for-the-badge&logo=express"/>
<img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb"/>
<img src="https://img.shields.io/badge/Better_Auth-Authentication-blue?style=for-the-badge"/>
<img src="https://img.shields.io/badge/JWT-Secure-red?style=for-the-badge"/>
</div>

---

# 📖 Overview

The BiblioDrop Server is a RESTful backend built with **Node.js**, **Express.js**, and **MongoDB**.

It handles all business logic, authentication, authorization, database operations, payment verification, delivery management, reviews, and administrative functionality for the BiblioDrop platform.

The server is designed with scalability, security, and maintainability in mind while providing fast API responses for the client application.

---

# 🎯 Responsibilities

✔ Authentication

✔ Authorization

✔ User Management

✔ Book Management

✔ Review Management

✔ Reading List

✔ Stripe Payment

✔ Delivery Management

✔ Dashboard Statistics

✔ Admin Controls

---

# 🏗 Architecture

```

Express Server
        │
        ├── Authentication
        ├── Authorization
        ├── Controllers
        ├── Routes
        ├── Middleware
        ├── Stripe
        └── MongoDB
```

---

# ⚡ Tech Stack

## Runtime

- Node.js

---

## Framework

- Express.js

---

## Database

- MongoDB Atlas

---

## Authentication

- Better Auth

- JWT

- Secure Cookies

---

## Payment

- Stripe Checkout

---

## Other Packages

- dotenv

- cors

- mongodb

- stripe

- better-auth

---

# 📂 Project Structure

```
server
│
├── middleware/
│
├── routes/
│
├── utils/
│
├── config/
│
├── .env
│
├── index.js
│
└── package.json
```

---

# 🔑 Authentication

The server uses **Better Auth** for authentication.

Features include:

- User Registration

- Login

- Logout

- Session Management

- JWT Verification

- Protected Routes

---

# 🛡 Authorization

Role-based access control is implemented.

### Reader

- Request Delivery

- Review Books

- Reading List

---

### Librarian

- Add Books

- Edit Books

- Delete Books

- Manage Deliveries

---

### Admin

- Manage Users

- Manage Books

- Approve Books

- Reject Books

- Transactions

---

# 📚 API Modules

## Authentication

- User Login

- User Registration

- Session

---

## Users

- Get User

- Update Profile

- Manage Users

---

## Books

- Add Book

- Get Books

- Book Details

- Update Book

- Delete Book

- Approve Book

---

## Reviews

- Add Review

- Get Reviews

- Rating

---

## Reading List

- Add Reading List

- Remove Reading List

- Get User Reading List

---

## Deliveries

- Request Delivery

- Delivery Status

- Delivery History

---

## Payments

- Create Stripe Checkout

- Payment Success

- Payment History

- Transactions

---

# 💳 Stripe Integration

Features

- Secure Checkout

- Payment Verification

- Transaction Storage

- Delivery Confirmation

---

# 🗄 Database Collections

```
users

books

reviews

payments

readingList

deliveries
```

---

# 🔒 Security Features

✅ Better Auth Authentication

✅ JWT Authorization

✅ Protected APIs

✅ Role-Based Access Control

✅ Environment Variables

✅ Secure Cookies

✅ MongoDB Validation

---

# ⚡ Performance

- Async Database Queries

- Efficient MongoDB Indexing

- Lightweight REST APIs

- Fast Response Time

- Optimized Middleware


---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/MaksumulEmon/-BiblioDrop-Server.git
```

---

## Install Dependencies

```bash
npm install
```

---

## Run Development Server

```bash
npm run dev
```

---

## Production

```bash
npm start
```

---


# 🤝 Connected Client

Frontend Repository:

```
https://bibliodrop-client-iota.vercel.app/
```

Live Website:

```
https://bibliodrop-server-woad.vercel.app/
```

---

# 👨‍💻 Developer

## Maksumul Emon

Full Stack Web Developer

Backend developed using **Node.js**, **Express.js**, **MongoDB**, **Better Auth**, and **Stripe**.

---

# ⭐ Support

If you found this project helpful, please consider giving this repository a **⭐ Star** on GitHub.

It helps support future improvements and encourages continued development.

---

<div align="center">

### Made with ❤️ by Md Maksumul Haque Emon

</div>