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
- `player.js`: Unified player data endpoint combining account, summoner, and league info using PUUID-based endpoints
- `account.js`: Riot ID to PUUID conversion
- `summoner.js`: Summoner profile data
- `league.js`: Ranked information using `/lol/league/v4/entries/by-puuid/{encryptedPUUID}` endpoint

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

### Player Skill Calculation (algorithm.md based)
The system implements a comprehensive scoring algorithm:
- **Total Skill Score (100 points)**: Tier (60) + Win Rate (20) + KDA/Vision (10-20) + CS/Team Contribution (10)
- **Role Proficiency Score (50 points)**: Individual ratings for each position (TOP, JUNGLE, MID, ADC, SUPPORT)
- **Position-specific metrics**: Support players use Vision Score and Team Contribution instead of KDA and CS
- **Combined evaluation**: Both individual skill and role expertise determine team placement

### Caching Strategy
- 24-hour cache duration for API responses
- Dual-layer caching (memory + localStorage)
- Automatic cache invalidation on expiry

## Important Files to Know

- `src/utils/teamBalancer.js` - Core balancing algorithm with smart composition generation and multi-factor scoring
- `src/services/riotAPI.js` - API service layer with dual caching (memory + localStorage) and mock mode support
- `src/data/players.js` - Player scoring utilities and data structures following algorithm.md specification
- `api/riot/*.js` - Vercel serverless functions using latest PUUID-based Riot API endpoints
- `vercel.json` - Vercel configuration with CORS headers and API routing
- `src/App.js` - Main application state management and player data persistence

## API Endpoint Structure

### Riot API Integration
The system uses modern Riot API endpoints:
- **Account API**: `asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` (Regional)
- **Summoner API**: `kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{encryptedPUUID}` (Platform)
- **League API**: `kr.api.riotgames.com/lol/league/v4/entries/by-puuid/{encryptedPUUID}` (Platform)

### Data Flow
1. Frontend sends Riot ID (gameName#tagLine) to `/api/riot/player`
2. Player endpoint calls Account API to get PUUID
3. Uses PUUID for Summoner and League API calls
4. Returns unified player data with calculated scores
5. Frontend caches results and displays in UI