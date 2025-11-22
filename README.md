# Assembline Platform Backend

Complete backend API for the Assembline Manufacturing Platform.

## Project Structure

```
Dashboard/
├── src/
│   ├── models/          # MongoDB models (8 models)
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   ├── middleware/      # Express middleware (auth)
│   ├── config/          # Configuration (database)
│   ├── types/           # TypeScript type definitions
│   └── server.ts        # Main server file
├── package.json
├── tsconfig.json
└── .gitignore
```

## Files Created

### Models (8 files)
- User.ts
- OEE.ts
- Scrap.ts
- CIProject.ts
- Financial.ts
- Customer.ts
- JobCard.ts
- Training.ts

### Routes (9 files - all created ✅)
- auth.ts ✅
- executiveSummary.ts ✅
- operationalPerformance.ts ✅
- wasteQuality.ts ✅
- continuousImprovement.ts ✅
- financialImpact.ts ✅
- customerImpact.ts ✅
- jobCard.ts ✅
- ai.ts ✅

### Services (3 files)
- calculationService.ts ✅
- aiService.ts ✅
- notificationService.ts ✅

### Other Files
- middleware/auth.ts ✅
- config/database.ts ✅
- types/common.ts ✅
- server.ts ✅

## Setup Complete! ✅

All backend files have been created. Next steps:

1. Create `.env` file (copy from `.env.example` if available, or create with these variables):
   ```
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/assembline
   JWT_SECRET=your-secret-key-change-in-production
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3001
   ```

2. Install dependencies: `npm install`

3. Start MongoDB (if running locally)

4. Run the server: `npm run dev`

Server will start on http://localhost:3000

## Quick Start

```bash
npm install
npm run dev
```

Server will run on http://localhost:3000

