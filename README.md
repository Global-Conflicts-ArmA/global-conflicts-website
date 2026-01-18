# 🌍 Global Conflicts Website

A modern web application built with [Next.js](https://nextjs.org/) and [Tailwind CSS](https://tailwindcss.com/) for managing global conflict information, events, missions, and community content.

## 🚀 Tech Stack

- **Frontend**: Next.js 13, React 18, TypeScript
- **Styling**: Tailwind CSS, DaisyUI, Flowbite
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: NextAuth.js
- **Media**: YouTube Integration, Imgur API

## 📋 Prerequisites

Before you get started, make sure you have the following installed on your system:

- **Node.js** and **npm** (Download from [nodejs.org](https://nodejs.org/))
- **MongoDB Community Edition** (Download from [mongodb.com](https://www.mongodb.com/try/download/community))

## 🔧 Installation & Setup

### 1️⃣ Install Yarn Globally

We recommend using Yarn as the package manager for this project. Install it globally using npm:

```bash
npm install -g yarn
```

### 2️⃣ Install Dependencies

Navigate to the project directory and install all dependencies:

```bash
yarn install
```

### 3️⃣ Set Up MongoDB

Make sure MongoDB Community Edition is installed and running on your system. Then, set the `MONGO_HOST` environment variable:

**On Windows (PowerShell):**
```powershell
$env:MONGO_HOST="mongodb://localhost:27017"
```

**On Windows (Command Prompt):**
```cmd
set MONGO_HOST=mongodb://localhost:27017
```

**On macOS/Linux:**
```bash
export MONGO_HOST="mongodb://localhost:27017"
```

Or create a `.env.local` file in the project root:
```
MONGO_HOST=mongodb://localhost:27017
```

## 📦 Available Scripts

The following npm scripts are available in this project:

| Command | Description |
|---------|-------------|
| `npm run dev` | 🏃 Start the development server at http://localhost:3000 |
| `npm run build` | 🔨 Build the application for production |
| `npm run start` | ⚡ Start the production server |
| `npm run startCustom` | 🎯 Start using custom server configuration |
| `npm run lint` | ✅ Run ESLint to check code quality |

## 🏁 Getting Started

### Development

To start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000). The page will hot-reload when you make changes.

### Production

To build and run the application in production mode:

```bash
npm run build
npm run start
```

### Custom Server

For a custom server setup, use:

```bash
npm run startCustom
```

## 📝 Project Structure

```
├── _guides/              # Guide documentation files
├── components/           # Reusable React components
├── interfaces/           # TypeScript interfaces
├── layouts/              # Page layout components
├── lib/                  # Utility functions and helpers
├── middleware/           # Authentication and custom middleware
├── pages/                # Next.js pages and API routes
├── public/               # Static assets
├── styles/               # Global stylesheets
├── package.json          # Project dependencies
└── tsconfig.json         # TypeScript configuration
```

## 🤝 Contributing

When contributing to this project, please ensure that:
- Your code follows the project's ESLint configuration
- You test your changes locally before submitting
- You update relevant documentation

## 📄 License

This project is private and proprietary.
