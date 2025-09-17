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

### v1 (Coming Soon)
- 💳 **Payments Integration** - Corbits + Phantom wallet support
- 🔗 **Advanced Features** - Enhanced functionality with payment-gated features

## 🚀 Prerequisites

- **Node.js 20+** and npm/pnpm
- **Supabase Project** - Get your URL and anon key from [supabase.com](https://supabase.com)
- **Anthropic API Key** - Get your key from [console.anthropic.com](https://console.anthropic.com)

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

# v1 Future Features (keep these for v1)
NEXT_PUBLIC_CORBITS_FACILITATOR_URL=https://facilitator.corbits.com
NEXT_PUBLIC_ENABLE_PAYMENTS=false
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
    │   ├── profile/page.tsx       # User profile
    │   ├── auth/                  # Authentication pages
    │   └── api/                   # API routes
    ├── components/                 # Reusable UI components
    ├── lib/                       # Core utilities
    ├── theme/                     # Design tokens
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

## 🔮 v1 Features (Coming Soon)

### Payment Integration

To enable payments in v1, set:

```env
NEXT_PUBLIC_ENABLE_PAYMENTS=true
NEXT_PUBLIC_CORBITS_FACILITATOR_URL=your_facilitator_url
```

### Architecture

- **Corbits Integration**: Ready-to-activate payment processing
- **Phantom Wallet**: Wallet connection scaffolding in place
- **Feature Flags**: Clean separation between v0 and v1 features

All payment-related code is feature-flagged and ready for v1 activation.

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

### Getting Help

- Check browser console for errors
- Verify all environment variables are set
- Ensure API keys have proper permissions

## 📄 License

MIT License - see LICENSE file for details.

## 🏔️ About

Built with the precision and confidence of a perfect couloir line. Mallory helps you navigate any challenge, just like finding the ideal path down a mountain face.

**Made with** Next.js 14, TypeScript, Tailwind CSS, Supabase, and Claude 3.5 Sonnet.

---

*Ready to start your ascent? [Get started](#setup) now!*# mallory
