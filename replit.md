# Alto-Forno - Blast Furnace Metallurgy Support App

## Overview
Mobile app for blast furnace metallurgy operational support. Built with Expo React Native (frontend) + Express (backend).

## Architecture
- **Frontend**: Expo Router with 5 tabs (Leito, Operacional, Pessoas, Tarefas, Estoque)
- **Backend**: Express server on port 5000
- **Storage**: AsyncStorage for local data persistence
- **Theme**: Dark industrial theme with orange/blue accents

## Key Features
- Fusion bed (leito) management with ore compositions, fluxes, fuel
- Metallurgical calculations (gusa production, slag volume, limestone/bauxite corrections)
- People presence tracking
- Task management
- Inventory control
- Camera capture for future OCR integration

## Project Structure
- `app/(tabs)/` - 5 main tab screens
- `app/leito-form.tsx` - Fusion bed create/edit modal
- `app/operational-calc.tsx` - Calculation modal
- `lib/types.ts` - TypeScript interfaces
- `lib/storage.ts` - AsyncStorage CRUD operations
- `lib/calculations.ts` - Metallurgical calculation engine
- `constants/colors.ts` - Dark theme color system

## User Preferences
- Portuguese (PT-BR) UI language
- Dark theme
- Industrial design aesthetic
