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

### Donation fee estimate

The donate page uses the official Patreon OAuth API v2 with the server-side
`PATREON_ACCESS_TOKEN` and `PATREON_CAMPAIGN_ID` (default `5074062`).
Active member entitlements are totaled across all pages and converted to USD.
They are not verified collected revenue.

The displayed net support range applies an illustrative 8% Pro platform fee
and processing fees per active paid member: 5% + $0.10 for USD amounts of $3
or less, otherwise 2.9% + $0.30. It assumes one monthly payment per member;
annual billing and actual transaction fees may differ. The lower estimate
also deducts 2.5% of all support for possible currency conversion; the upper
estimate deducts no conversion fee because the API does not identify which
payments incur it. Tax and payout fees are excluded.

The progress bar uses the lower net estimate before tax. Gross support and
the fee breakdown remain visible. Saved totals without a fee breakdown are
refreshed when possible and never assigned fabricated per-payment fees.
Keep tokens out of source control. Rebuild and recycle the IIS app pool
after deployment.

Run fee-estimate regression tests with `node --test scripts/donations.test.cjs`.

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
