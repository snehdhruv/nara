# Nara - Nextron + Convex + Spotify OAuth

A desktop music application built with Nextron (Next.js + Electron), Convex for real-time backend, and Spotify OAuth integration.

## ✨ Features

- ⚡ **Electron + Next.js** - Cross-platform desktop app
- 🎵 **Spotify OAuth** - Authenticate with your Spotify account  
- 📊 **Convex Backend** - Real-time database and authentication
- 💬 **Real-time Messaging** - Send and receive messages instantly
- ❤️ **Favorite Tracks** - Save and manage your favorite songs
- 🎨 **Tailwind CSS** - Beautiful, responsive UI

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Set up Spotify OAuth

See [SPOTIFY_SETUP.md](./SPOTIFY_SETUP.md) for detailed instructions on configuring Spotify OAuth.

### 3. Start Development

```bash
bun run dev
```

This will start both the Convex development server and the Nextron app.

## 📖 Original Nextron Documentation

<p align="center"><img src="https://i.imgur.com/a9QWW0v.png"></p>

## Usage

### Create an App

```
# with npx
$ npx create-nextron-app my-app --example with-tailwindcss

# with yarn
$ yarn create nextron-app my-app --example with-tailwindcss

# with pnpm
$ pnpm dlx create-nextron-app my-app --example with-tailwindcss
```

### Install Dependencies

```
$ cd my-app

# using yarn or npm
$ yarn (or `npm install`)

# using pnpm
$ pnpm install --shamefully-hoist
```

### Use it

```
# development mode
$ yarn dev (or `npm run dev` or `pnpm run dev`)

# production build
$ yarn build (or `npm run build` or `pnpm run build`)
```
