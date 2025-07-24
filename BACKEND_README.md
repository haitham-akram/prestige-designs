# Prestige Designs - Design Store Backend

A modern e-commerce platform for selling digital designs built with Next.js, MongoDB, and NextAuth.js.

## 🚀 Features

### Authentication & Authorization

- **Multiple Login Methods**: Email/Password, Google OAuth, Twitter OAuth
- **User Roles**: Customer, Seller, Admin with role-based access control
- **Secure Authentication**: JWT tokens, bcrypt password hashing
- **Email Verification**: Token-based email verification system
- **Password Reset**: Secure password reset functionality

### User Management

- **User Profiles**: Complete user profile management
- **Seller Profiles**: Extended profiles for design sellers
- **Preferences**: Customizable user preferences and settings
- **Social Links**: Integration with social media profiles

### Database & Models

- **MongoDB Integration**: Using Mongoose ODM
- **User Model**: Comprehensive user schema with validations
- **Session Management**: Persistent session storage
- **Data Validation**: Input validation using Zod

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js v4
- **Validation**: Zod for schema validation
- **Password Hashing**: bcryptjs
- **JWT**: jsonwebtoken for token generation
- **TypeScript**: Full type safety
- **Styling**: Tailwind CSS

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts          # NextAuth API handler
│   │   └── users/
│   │       ├── register/
│   │       │   └── route.ts          # User registration API
│   │       └── profile/
│   │           └── route.ts          # User profile management API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── auth/
│   │   ├── config.ts                 # NextAuth configuration
│   │   └── utils.ts                  # Authentication utilities
│   └── db/
│       ├── connection.ts             # MongoDB connection handler
│       └── models/
│           └── User.ts               # User model schema
```

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Update the environment variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/prestige-designs

# NextAuth
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Twitter OAuth
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# JWT
JWT_SECRET=your-jwt-secret-here
```

### 3. OAuth Setup

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

#### Twitter OAuth

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Get API Key and Secret
4. Add callback URL: `http://localhost:3000/api/auth/callback/twitter`

### 4. Database Setup

Make sure MongoDB is running:

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas cloud database
```

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📚 API Documentation

### Authentication Endpoints

#### POST `/api/users/register`

Register a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "customer" // optional: "customer" | "seller"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

#### GET `/api/users/profile`

Get current user profile (requires authentication).

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "isEmailVerified": false,
    "preferences": {
      "emailNotifications": true,
      "theme": "system"
    }
  }
}
```

#### PUT `/api/users/profile`

Update user profile (requires authentication).

**Request Body:**

```json
{
  "name": "Updated Name",
  "bio": "Updated bio",
  "sellerProfile": {
    "shopName": "My Design Shop",
    "description": "Professional design services"
  }
}
```

### Authentication Routes

- **Sign In**: `/api/auth/signin`
- **Sign Out**: `/api/auth/signout`
- **Session**: `/api/auth/session`
- **Google OAuth**: `/api/auth/signin/google`
- **Twitter OAuth**: `/api/auth/signin/twitter`

## 🔐 Security Features

### Password Security

- Minimum 6 characters (recommended 8+)
- bcrypt hashing with salt rounds of 12
- Password strength validation
- Secure password reset tokens

### Authentication Security

- JWT tokens with configurable expiration
- Session-based authentication with NextAuth.js
- CSRF protection
- Secure OAuth implementation

### Database Security

- Input validation with Zod schemas
- MongoDB injection prevention
- Sanitized error messages
- Secure field selection

## 🔄 User Roles & Permissions

### Customer

- Create and manage personal profile
- Browse and purchase designs
- Manage preferences and settings

### Seller

- All customer permissions
- Create and manage seller profile
- Upload and sell designs (when verified)
- Access seller dashboard

### Admin

- All user permissions
- Manage user accounts
- Verify seller accounts
- Access admin dashboard

## 🚧 Next Steps

1. **Email Service**: Implement email verification and password reset emails
2. **Design Models**: Create models for designs, categories, orders
3. **Payment Integration**: Add Stripe or PayPal for payments
4. **File Upload**: Implement design file upload functionality
5. **Admin Dashboard**: Create admin interface for user management
6. **Seller Dashboard**: Create seller interface for design management

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
