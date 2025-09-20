import { z } from 'zod'

// Zod schema for payment configuration
const PaymentConfigSchema = z.object({
  facilitatorUrl: z.string().url('VITE_FAREMETER_FACILITATOR_URL must be a valid URL'),
  scheme: z.string().default('x-solana-settlement'),
  network: z.string().default('solana:mainnet'),
  usdcMint: z.string().default('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  amazonProxyUrl: z.string().url('VITE_AMAZON_PROXY_URL must be a valid URL').default('http://localhost:8787'),
  paymentProxyUrl: z.string().url('VITE_PAYMENT_PROXY_URL must be a valid URL').default('http://localhost:8787'),
  crossmintApiKey: z.string().optional(),
  crossmintEnv: z.enum(['sandbox', 'production']).default('sandbox'),
  serpApiKey: z.string().optional(),
})

const HealthEndpointsSchema = z.object({
  facilitator: z.string(),
  amazonProxy: z.string(),
  paymentProxy: z.string(),
})

export type PaymentConfig = z.infer<typeof PaymentConfigSchema>
export type HealthEndpoints = z.infer<typeof HealthEndpointsSchema>

// Parse and validate environment variables
function getPaymentConfig(): PaymentConfig {
  const rawConfig = {
    facilitatorUrl: process.env.VITE_FAREMETER_FACILITATOR_URL || process.env.NEXT_PUBLIC_FACILITATOR_URL,
    scheme: process.env.VITE_FAREMETER_SCHEME || 'x-solana-settlement',
    network: process.env.VITE_FAREMETER_NETWORK || 'solana:mainnet',
    usdcMint: process.env.VITE_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amazonProxyUrl: process.env.VITE_AMAZON_PROXY_URL || process.env.NEXT_PUBLIC_AMAZON_PROXY_URL || 'http://localhost:8787',
    paymentProxyUrl: process.env.VITE_PAYMENT_PROXY_URL || 'http://localhost:8787',
    crossmintApiKey: process.env.VITE_CROSSMINT_API_KEY,
    crossmintEnv: (process.env.VITE_CROSSMINT_ENV as 'sandbox' | 'production') || 'sandbox',
    serpApiKey: process.env.VITE_SERP_API_KEY || process.env.SERP_API_KEY,
  }

  try {
    return PaymentConfigSchema.parse(rawConfig)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')
      throw new Error(`Payment configuration validation failed: ${errorMessages}`)
    }
    throw error
  }
}

// Get health check endpoints
function getHealthEndpoints(): HealthEndpoints {
  const config = getPaymentConfig()

  return {
    facilitator: `${config.facilitatorUrl}/health`,
    amazonProxy: `${config.amazonProxyUrl}/health`,
    paymentProxy: `${config.paymentProxyUrl}/health`,
  }
}

// Available x402 payment schemes (in order of preference)
export const PAYMENT_SCHEMES = [
  'x-solana-settlement',
  'x-ethereum-settlement',
  'x-bitcoin-settlement',
] as const

export type PaymentScheme = typeof PAYMENT_SCHEMES[number]

// Default scheme selector - prefers x-solana-settlement
export function choosePreferredScheme(availableSchemes: string[]): PaymentScheme | null {
  for (const preferredScheme of PAYMENT_SCHEMES) {
    if (availableSchemes.includes(preferredScheme)) {
      return preferredScheme
    }
  }
  return null
}

// Idempotency key generator
export function generateIdempotencyKey(walletAddress: string, productAsin: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${walletAddress.substring(0, 8)}-${productAsin}-${timestamp}-${random}`
}

// Export the configuration instances
export const paymentConfig = getPaymentConfig()
export const healthEndpoints = getHealthEndpoints()

// Error types for better error handling
export class PaymentConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentConfigError'
  }
}

export class HealthCheckError extends Error {
  constructor(
    public endpoint: string,
    public status?: number,
    message?: string
  ) {
    super(message || `Health check failed for ${endpoint}`)
    this.name = 'HealthCheckError'
  }
}

// Utility function to validate that all required services are configured
export function validatePaymentSetup(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    getPaymentConfig()
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}