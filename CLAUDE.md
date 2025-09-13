# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a League of Legends team balancing system built with React that intelligently creates balanced teams for custom games. The project is located in the `lol-team-balance` subdirectory and deployed on Vercel with serverless functions for Riot API integration.

## Development Commands

### Running the Development Server
```bash
cd lol-team-balance
npm start       # Starts React dev server on localhost:3000
```

### Building and Testing
```bash
npm run build   # Create production build
npm test        # Run tests with Jest
```

### Deployment
```bash
git push origin main   # Auto-deploys to Vercel
```

## Architecture & Key Components

### Core Algorithm (`src/utils/teamBalancer.js`)
The team balancing system uses a sophisticated algorithm that:
- Generates smart team compositions using role-based matching
- Evaluates team balance based on multiple criteria (skill score, role proficiency, position fit)
- Enforces strict balancing rules: max 30-point skill difference and 5-point proficiency difference per lane
- Uses a multi-factor scoring system with weighted components (30% team total, 40% lane matchups, 20% position fit, 10% synergy)
- Falls back to a simpler algorithm if valid compositions cannot be generated

### API Integration Structure
The project uses a dual-mode API system:
- **Mock Mode**: Uses local data for development without API key (`USE_MOCK: true` in `src/services/riotAPI.js`)
- **Live Mode**: Connects to Riot Games API through Vercel serverless functions in `/api/riot/`
- Caching layer with 24-hour retention using localStorage and memory cache

### Vercel Serverless Functions
Located in `/api/riot/`, these handle CORS and proxy Riot API calls:
- `player.js`: Unified player data endpoint combining account, summoner, and league info
- `account.js`: Riot ID to PUUID conversion
- `summoner.js`: Summoner profile data
- `league.js`: Ranked information

### React Component Structure
- **Drag & Drop System**: Uses @dnd-kit for team arrangement
- **State Management**: React hooks with localStorage persistence
- **Player Data Flow**: PlayerPool → SelectedPlayers → Team1/Team2
- **Modal System**: AddPlayerModal and EditPlayerModal for player management

## Environment Configuration

### API Key Setup
Create `.env.local` in `lol-team-balance/`:
```
RIOT_API_KEY=your_riot_api_key_here
```

For Vercel deployment, add the same variable in Project Settings → Environment Variables.

### API Mode Toggle
In `src/services/riotAPI.js`, line 11:
- `USE_MOCK: false` - Use live Riot API (requires API key)
- `USE_MOCK: true` - Use mock data (no API key needed)

## Key Technical Decisions

### Balance Grading System
- **황벨 (Golden)**: <8% difference - Perfect balance
- **맞벨 (Fair)**: 8-20% difference - Good balance
- **똥벨 (Poor)**: >20% difference or violates hard limits - Poor balance

### Player Skill Calculation
- Total Score = Tier Level × 10 + Performance Modifier
- Role Score = Position Mastery × Role Proficiency
- Combined evaluation considers both individual skill and role expertise

### Caching Strategy
- 24-hour cache duration for API responses
- Dual-layer caching (memory + localStorage)
- Automatic cache invalidation on expiry

## Important Files to Know

- `src/utils/teamBalancer.js` - Core balancing algorithm
- `src/services/riotAPI.js` - API service layer with caching
- `api/riot/*.js` - Vercel serverless functions
- `vercel.json` - Vercel configuration with CORS and routing
- `src/App.js` - Main application logic and state management