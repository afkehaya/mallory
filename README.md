# Mallory.fun v0

**Your Couloir-Inspired Super Agent**

Mallory is a production-quality, mobile-first web application that provides intelligent conversations powered by Claude 3.5 Sonnet. Inspired by the precision and confidence of couloir mountaineering, Mallory helps you navigate any challenge with expert guidance.

## ✨ Features

### v0 (Current)
- 🔐 **Secure Authentication** - Magic link email authentication via Supabase
- 💬 **Intelligent Chat** - Real-time streaming conversations with Claude 3.5 Sonnet
- 📱 **Mobile-First Design** - Responsive, high-contrast UI optimized for all devices
- 🎨 **Beautiful Interface** - Custom couloir-inspired design with smooth animations
- ⚡ **Lightning Fast** - Edge-optimized API routes with streaming responses

### v1 (Available)
- 💳 **Payments Integration** - x402/Faremeter integration with hosted facilitator
- 🛍️ **Amazon Shopping** - Purchase items via x402 payment flow
- 🔗 **Solana Integration** - Query mainnet data via MCP server
- 💰 **Wallet Management** - Mallory-controlled wallet for payments

## 🚀 Prerequisites

### Core Requirements
- **Node.js 20+** and npm/pnpm
- **Supabase Project** - Get your URL and anon key from [supabase.com](https://supabase.com)
- **Anthropic API Key** - Get your key from [console.anthropic.com](https://console.anthropic.com)

### v1 Features (Optional)
- **MCP Solana Server** - Clone and run [corbits-demos/packages/mcp-solana](https://github.com/abklabs/corbits-demos/tree/main/packages/mcp-solana)
- **Amazon Faremeter Demo** - Clone and run [corbits-demos/demos/amazon-faremeter](https://github.com/abklabs/corbits-demos/tree/main/demos/amazon-faremeter)

## ⚙️ Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd malloryapp
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env.local
```

Fill in your environment variables in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Anthropic API Key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Payments / x402 / Faremeter
NEXT_PUBLIC_ENABLE_PAYMENTS=true
NEXT_PUBLIC_FACILITATOR_URL=https://facilitator.corbits.dev

# Local demos you will run separately
NEXT_PUBLIC_AMAZON_PROXY_URL=http://localhost:8787
NEXT_PUBLIC_MCP_SOLANA_URL=http://localhost:8765

# Solana (server-side wallet, dev only)
MALLORY_WALLET_SECRET_BASE58=   # optional; if empty, generate dev keypair and store server-only
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **Settings > API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In **Authentication > Settings**:
   - Enable "Enable email confirmations" (recommended)
   - Add your domain to "Site URL" (e.g., `http://localhost:3000` for development)

### 4. Anthropic API Setup

1. Create an account at [console.anthropic.com](https://console.anthropic.com)
2. Generate an API key
3. Add it to your `.env.local` as `ANTHROPIC_API_KEY`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see Mallory in action! 🎉

### 6. v1 Features Setup (Optional)

To enable the full v1 payment and integration features:

#### a) Start Local Demo Services

```bash
# Option 1: Use the provided script (if corbits-demos is cloned alongside)
npm run dev:externals

# Option 2: Start services manually in separate terminals
# Terminal 1: MCP Solana Server
cd ../corbits-demos/packages/mcp-solana
pnpm install && pnpm dev

# Terminal 2: Amazon Faremeter Demo
cd ../corbits-demos/demos/amazon-faremeter
pnpm install && pnpm dev

# Terminal 3: Mallory App
npm run dev
```

#### b) Test the Features

1. **Wallet**: Visit [/wallet](http://localhost:3000/wallet)
   - View Mallory's auto-generated wallet address
   - Fund the wallet with demo USDC/SOL
   - Copy the address for testing

2. **Amazon Demo**: Visit [/demos/amazon](http://localhost:3000/demos/amazon)
   - Use SKU: `B00EXAMPLE`
   - Quantity: `1`
   - Click "Purchase via x402" and watch the payment flow

3. **Solana Demo**: Visit [/demos/solana](http://localhost:3000/demos/solana)
   - Click "Use Mallory" to load the wallet address
   - Query balance, signatures, or specific transactions

#### c) Console Output

When running `npm run dev`, you'll see:

```
✅ Mallory v1 Features Active
📍 Wallet: [Generated Address]
🛍️ Amazon Demo: http://localhost:3000/demos/amazon
🔗 Solana Demo: http://localhost:3000/demos/solana
💰 Wallet: http://localhost:3000/wallet

Prerequisites:
- MCP Solana: http://localhost:8765
- Amazon Proxy: http://localhost:8787
```

## 🏗️ Project Structure

```
malloryapp/
├── .env.example                    # Environment template
├── README.md                       # You are here
├── package.json                    # Dependencies & scripts
├── next.config.js                  # Next.js configuration
├── tailwind.config.ts              # Tailwind theme config
├── tsconfig.json                   # TypeScript configuration
├── public/
│   ├── favicon.ico                 # Favicon
│   ├── logo-mallory.svg           # Main logo
│   └── motif-couloir.svg          # Design motif
└── src/
    ├── app/                        # Next.js App Router
    │   ├── layout.tsx             # Root layout
    │   ├── page.tsx               # Landing page
    │   ├── globals.css            # Global styles
    │   ├── chat/page.tsx          # Chat interface
    │   ├── wallet/page.tsx        # Wallet management (v1)
    │   ├── demos/                 # Demo pages (v1)
    │   │   ├── amazon/page.tsx    # Amazon purchase demo
    │   │   └── solana/page.tsx    # Solana data queries
    │   ├── auth/                  # Authentication pages
    │   └── api/                   # API routes
    │       ├── chat/route.ts      # Claude streaming chat
    │       ├── wallet/route.ts    # Wallet management (v1)
    │       ├── amazon/purchase/   # Amazon x402 handler (v1)
    │       └── solana/            # Solana MCP proxies (v1)
    ├── components/                 # Reusable UI components
    ├── lib/                       # Core utilities
    │   └── server/                # Server-side utilities (v1)
    │       ├── x402.ts           # x402 payment handler
    │       └── wallet.ts         # Solana wallet management
    ├── providers/                 # React context providers
    ├── hooks/                     # Custom React hooks
    └── types/                     # TypeScript definitions
```

## 🎨 Design System

Mallory uses a custom design system inspired by couloir mountaineering:

- **Colors**: Deep space backgrounds with icy teal and violet accents
- **Typography**: Inter for body text, Space Grotesk for headings
- **Motifs**: Geometric couloir-inspired shapes and gradients
- **Animations**: Subtle fade-ins and sliding animations for smooth interactions

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run dev:externals # Start MCP and Amazon demo servers (v1)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript checks
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repo to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
4. Deploy! 🚀

### Other Platforms

Mallory works with any platform that supports Next.js:
- **Netlify**: Use `@netlify/plugin-nextjs`
- **Railway**: Direct Next.js support
- **Render**: Static site + Node.js service

## 🏛️ Architecture

### v0 (Base Chat)
- **Next.js 14** with App Router for modern React development
- **Supabase** for authentication and user management
- **Anthropic Claude** for intelligent conversation streaming
- **Tailwind CSS** + **Framer Motion** for beautiful, responsive UI

### v1 (Payments & Integrations)
- **x402/Faremeter** protocol for micropayments via hosted facilitator
- **Solana Web3.js** for blockchain wallet management (server-side only)
- **MCP (Model Context Protocol)** for Solana data queries
- **Feature Flags** for clean separation between v0 and v1 functionality

All payment features are optional and feature-flagged for backwards compatibility.

## 🐛 Troubleshooting

### Common Issues

**"User not authenticated" errors**
- Check your Supabase URL and keys in `.env.local`
- Verify Supabase project is active
- Check Site URL in Supabase auth settings

**Chat not responding**
- Verify `ANTHROPIC_API_KEY` is correct
- Check API key has sufficient credits
- Look for errors in browser console

**Email magic links not working**
- Check Supabase email settings
- Verify Site URL matches your domain
- Check spam folder

**v1 Features not showing**
- Ensure `NEXT_PUBLIC_ENABLE_PAYMENTS=true` in `.env.local`
- Check that MCP server is running on port 8765
- Verify Amazon proxy is running on port 8787
- Look for "Wallet", "Amazon", "Solana" buttons in chat header

**x402 payment failures**
- Verify facilitator URL is correct: `https://facilitator.corbits.dev`
- Check browser network tab for 402 responses
- Ensure demo proxy servers are responding

### Getting Help

- Check browser console for errors
- Verify all environment variables are set
- Ensure API keys have proper permissions
- For v1 issues, check server logs for x402 and MCP errors

## 📄 License

MIT License - see LICENSE file for details.

## 🏔️ About

Built with the precision and confidence of a perfect couloir line. Mallory helps you navigate any challenge, just like finding the ideal path down a mountain face.

**Made with** Next.js 14, TypeScript, Tailwind CSS, Supabase, and Claude 3.5 Sonnet.

---

*Ready to start your ascent? [Get started](#setup) now!*# mallory
