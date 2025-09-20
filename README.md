# Mallory - AI-Powered Amazon Shopping with USDC Payments

**Production-ready chat interface for Amazon purchases using Solana USDC payments via x402 protocol**

Mallory is a Next.js application that combines Claude AI conversation capabilities with real Amazon shopping functionality powered by USDC payments on Solana mainnet. Users can chat naturally to search for products, get recommendations, and complete real purchases with cryptocurrency.

## 🏗️ System Architecture

### Core Infrastructure
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mallory App   │    │  Amazon Proxy   │    │   MCP Solana    │
│   (Next.js)     │    │   (Node.js)     │    │   (TypeScript)  │
│   Port: 3001    │◄──►│   Port: 8787    │    │   Port: 8765    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│ Payment Proxy   │◄─────────────┘
                        │ (x402 Provider) │
                        │   Port: 8402    │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   Crossmint     │
                        │  (Amazon API)   │
                        └─────────────────┘
```

### Required Repositories

This system requires **3 separate repositories** to be cloned and running:

1. **malloryapp** (this repo) - Main chat interface and API routes
2. **amazon-demo-proxy** - Amazon product search and purchase proxy
3. **corbits-demos/packages/mcp-solana** - Solana wallet tools and payment proxy

## 🚀 Quick Start

### 1. Clone All Required Repositories

```bash
# Create a workspace directory
mkdir mallory-workspace && cd mallory-workspace

# Clone the main Mallory app (this repo)
git clone [your-mallory-repo-url] malloryapp

# Clone the Amazon proxy
git clone https://github.com/abklabs/amazon-demo-proxy.git

# Clone the MCP Solana tools
git clone https://github.com/abklabs/corbits-demos.git
```

### 2. Repository Structure
```
mallory-workspace/
├── malloryapp/              # Main chat interface (this repo)
├── amazon-demo-proxy/       # Amazon product search & purchase
└── corbits-demos/
    └── packages/
        └── mcp-solana/      # Solana tools & payment proxy
```

### 3. Environment Setup

#### Mallory App (.env.local)
```bash
cd malloryapp
cp .env.example .env.local
```

Configure your `.env.local`:
```env
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic API Key (Required)
ANTHROPIC_API_KEY=sk-ant-api03-your-key
CLAUDE_MODEL=claude-sonnet-4-20250514

# Payments Configuration (Mainnet)
NEXT_PUBLIC_ENABLE_PAYMENTS=true
VITE_FAREMETER_FACILITATOR_URL=https://facilitator.corbits.dev
VITE_FAREMETER_SCHEME=x-solana-settlement
VITE_FAREMETER_NETWORK=solana:mainnet
VITE_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Local Service URLs (Default ports)
VITE_AMAZON_PROXY_URL=http://localhost:8787
VITE_PAYMENT_PROXY_URL=http://localhost:8402
NEXT_PUBLIC_MCP_SOLANA_URL=http://localhost:8765

# Crossmint Configuration (For real Amazon purchases)
VITE_CROSSMINT_API_KEY=your-crossmint-api-key
VITE_CROSSMINT_ENV=production

# SERP API (For Amazon product search)
VITE_SERP_API_KEY=your-serp-api-key

# Solana Wallet (Generated automatically if not provided)
MALLORY_WALLET_SECRET_BASE58=
```

#### Amazon Proxy (.env)
```bash
cd ../amazon-demo-proxy
cp .env.example .env
```

Configure Amazon proxy `.env`:
```env
SERP_API_KEY=your-serp-api-key
CROSSMINT_API_KEY=your-crossmint-api-key
CROSSMINT_BASE_URL=https://www.crossmint.com/api/2022-06-09
PRODUCT_SIGNING_SECRET=your-signing-secret
```

#### MCP Solana (.env)
```bash
cd ../corbits-demos/packages/mcp-solana
cp .env.example .env
```

Configure MCP Solana `.env`:
```env
NETWORK=mainnet
SERVER_PORT=8765
PROXY_PORT=8402
PAYTO_ADDRESS=your-merchant-solana-address
PRICE_USDC=0.01
PAYER_KEYPAIR_PATH=/path/to/malloryapp/.wallet.json
FAREMETER_FACILITATOR_URL=https://facilitator.corbits.dev
MCP_SERVER_URL=http://localhost:8787
```

### 4. Install Dependencies

```bash
# Install all dependencies
cd malloryapp && npm install
cd ../amazon-demo-proxy && npm install
cd ../corbits-demos/packages/mcp-solana && npm install
```

### 5. Start All Services

#### Option A: Manual Start (Recommended for Development)
```bash
# Terminal 1: Amazon Proxy
cd amazon-demo-proxy
npm start

# Terminal 2: MCP Solana Payment Proxy
cd corbits-demos/packages/mcp-solana
npx tsx src/payment-proxy.ts

# Terminal 3: MCP Solana Server
cd corbits-demos/packages/mcp-solana
npx tsx src/http-server.ts

# Terminal 4: Mallory App
cd malloryapp
npm run dev
```

#### Option B: Using Development Script
```bash
cd malloryapp
npm run dev:externals  # Starts external services
npm run dev           # Start Mallory app (separate terminal)
```

### 6. Verify Setup

Visit http://localhost:3001 and you should see:
- ✅ Mallory chat interface
- ✅ Wallet management tools in header
- ✅ Amazon purchase capabilities in chat

Check all services are running:
- Mallory App: http://localhost:3001
- Amazon Proxy: http://localhost:8787/health
- Payment Proxy: http://localhost:8402/health
- MCP Solana: http://localhost:8765/health

## 🔧 Service Details

### Service Ports & Responsibilities

| Service | Port | Purpose | Repository |
|---------|------|---------|------------|
| **Mallory App** | 3001 | Chat interface, API routes | malloryapp |
| **Amazon Proxy** | 8787 | Product search, order processing | amazon-demo-proxy |
| **Payment Proxy** | 8402 | x402 payment facilitator | corbits-demos/packages/mcp-solana |
| **MCP Solana** | 8765 | Wallet tools, balance checks | corbits-demos/packages/mcp-solana |

### Data Flow

1. **User Chat** → Mallory App receives natural language request
2. **Product Search** → Amazon Proxy searches via SERP API
3. **Payment Request** → Payment Proxy handles x402 protocol
4. **USDC Transfer** → Solana mainnet transaction
5. **Order Creation** → Crossmint creates real Amazon order
6. **Confirmation** → User receives order ID and tracking

## 🛠️ API Endpoints

### Mallory App (Port 3001)
```
POST /api/chat              # Claude conversation streaming
GET  /api/wallet/balance     # Check USDC balance
POST /api/amazon/purchase    # Purchase with x402 flow
GET  /api/solana/balance     # Solana wallet balance
```

### Amazon Proxy (Port 8787)
```
GET  /products              # Search Amazon products
POST /purchase              # Create Amazon order
GET  /health                # Service health check
```

### Payment Proxy (Port 8402)
```
POST /purchase              # x402 payment processing
POST /payment-webhook       # Payment completion webhook
GET  /health                # Service health check
```

### MCP Solana (Port 8765)
```
POST /mcp/free              # Free Solana queries
POST /mcp/premium           # Premium Solana operations
GET  /health                # Service health check
```

## 🏛️ Architecture Deep Dive

### Payment Flow (x402 Protocol)
```
1. User: "Buy Amazon Basics pencils"
2. Claude: Searches products via Amazon Proxy
3. User: Confirms purchase
4. Mallory: Initiates x402 payment flow
5. Payment Proxy: Requests USDC payment
6. Solana: Transfers USDC to merchant
7. Crossmint: Creates real Amazon order
8. User: Receives order confirmation
```

### Technology Stack

**Frontend (Mallory App)**
- Next.js 14 with App Router
- TypeScript & Tailwind CSS
- Framer Motion animations
- Supabase authentication

**Backend Services**
- Node.js with Express (Amazon Proxy)
- TypeScript with Faremeter SDK (Payment Proxy)
- MCP (Model Context Protocol) integration

**Blockchain & Payments**
- Solana Web3.js for wallet operations
- x402 payment protocol
- USDC token transfers
- Crossmint for Amazon API integration

**External APIs**
- Anthropic Claude for AI conversation
- SERP API for Amazon product search
- Crossmint for Amazon order creation
- Supabase for user management

### Security Features

- **Server-side wallet**: Private keys never exposed to client
- **HMAC product signatures**: Prevent product tampering
- **x402 payment receipts**: Cryptographic payment proofs
- **Environment isolation**: Separate configs per service
- **Rate limiting**: Built-in API protection

## 🧪 Testing & Development

### Available Scripts

```bash
# Development
npm run dev              # Start Mallory app
npm run dev:externals    # Start external services
npm run dev:clean        # Clean ports before starting

# Code Quality
npm run lint             # ESLint checking
npm run type-check       # TypeScript validation
npm run format           # Prettier formatting

# Testing
npm run test:claude      # Test Claude API integration
npm run test:e2e         # Playwright end-to-end tests
npm run lint:x402        # Validate x402 implementation
```

### Testing Real Purchases

1. **Fund Wallet**: Send USDC to your generated wallet address
2. **Test Chat**: "I want to buy pencils for school"
3. **Verify Flow**: Check all services respond correctly
4. **Confirm Order**: Real Amazon order should be created

### Debugging

Check service logs in each terminal:
```bash
# Mallory App logs
[api/amazon/purchase] Purchase successful: {...}
[Faremeter] x402 flow completed

# Amazon Proxy logs
[Amazon Proxy] Searching for "pencils" via SerpAPI
[Amazon Proxy] Found 10 real Amazon products

# Payment Proxy logs
Payment proxy running on http://localhost:8402 (mainnet)
✅ Payment proxy configuration validated
```

## 🚨 Troubleshooting

### Common Issues

**Services Not Starting**
```bash
# Check if ports are in use
lsof -i :3001 :8787 :8402 :8765

# Kill processes if needed
npm run dev:clean
```

**Payment Failures**
- Verify wallet has sufficient USDC balance
- Check Solana RPC endpoint connectivity
- Ensure x402 facilitator is reachable

**Product Search Issues**
- Verify SERP API key is valid
- Check product catalog configuration
- Ensure Amazon proxy is responding

**Chat Not Responding**
- Check Anthropic API key and credits
- Verify Claude model permissions
- Look for rate limiting errors

### Required External Services

1. **Supabase Project** - User authentication
2. **Anthropic API** - Claude conversation
3. **SERP API** - Amazon product search
4. **Crossmint Account** - Amazon order creation
5. **Solana RPC** - Blockchain operations

## 📦 Deployment

### Environment-Specific Configuration

**Development**: All services on localhost
**Staging**: External services with test API keys
**Production**: Mainnet configuration with real API keys

### Vercel Deployment (Mallory App Only)

```bash
# Build and deploy main app
npm run build
vercel --prod

# Set environment variables in Vercel dashboard
# External services need separate hosting
```

### Full Stack Deployment

For production deployment, each service needs separate hosting:
- **Mallory App**: Vercel, Netlify, or similar
- **Amazon Proxy**: Railway, Render, or VPS
- **MCP Services**: Railway, Render, or VPS

## 📄 License

MIT License - see LICENSE file for details.

## 🏔️ About Mallory

Named after George Mallory, the legendary mountaineer. Just as Mallory sought the perfect route to the summit, this application finds the perfect path from conversation to purchase.

**Built with precision, powered by AI, secured by blockchain.**

---

*Ready to start building? Follow the [Quick Start](#quick-start) guide above!*