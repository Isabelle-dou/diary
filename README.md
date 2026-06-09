# DiaryEnglish - Learn English by Writing

A platform to help users learn English through daily diary writing with AI-powered feedback.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS 3**
- **Prisma** (ORM)
- **PostgreSQL** (Database)
- **NextAuth.js** (Authentication)
- **OpenAI API** (AI Analysis)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- OpenAI API Key

### Installation

1. **Clone the repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your values:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_URL`: Your application URL (e.g., http://localhost:3000)
   - `NEXTAUTH_SECRET`: A secret key for NextAuth (generate with `openssl rand -hex 32`)
   - `OPENAI_API_KEY`: Your OpenAI API key

4. **Set up the database**
   ```bash
   # Create database tables
   npx prisma migrate dev --name init
   
   # Generate Prisma client
   npx prisma generate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production version |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   └── auth/           # Authentication API
│   ├── auth/               # Auth pages (signin, signup)
│   ├── diary/              # Diary related pages
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── lib/                    # Utility functions
│   ├── auth.ts             # NextAuth configuration
│   ├── prisma.ts           # Prisma client singleton
│   └── openai.ts           # OpenAI API wrapper
├── prisma/                 # Prisma configuration
│   └── schema.prisma       # Database schema
├── .env.example            # Environment variables template
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Features

### MVP Features
- User registration and login
- Set English proficiency level (beginner/intermediate/advanced)
- Write daily diaries
- AI-powered grammar checking
- AI vocabulary suggestions
- AI collocation suggestions
- View diary list
- Delete diaries

### Future Features
- Edit diaries
- Vocabulary notebook
- Learning goals
- Daily reminders
- Learning reports
- User community
- Dark mode

## License

MIT
