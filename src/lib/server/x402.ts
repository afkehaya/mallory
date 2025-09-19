import { getWallet } from './wallet'

interface PaymentInstruction {
  payment_url: string
  amount: number
  currency: string
  recipient_address: string
  memo?: string
}

interface X402Response {
  error: string
  payment_instructions: PaymentInstruction
}

interface X402FetchOptions {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: any
}

interface FacilitatorPaymentRequest {
  payment_url: string
  sender_address: string
  signature?: string
}

export async function x402Fetch(options: X402FetchOptions): Promise<Response> {
  const { url, method = 'GET', headers = {}, body } = options

  console.log(`[x402] Making initial request to ${url}`)

  // Make initial request
  const initialResponse = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  // If not 402, return the response as-is
  if (initialResponse.status !== 402) {
    console.log(`[x402] Request completed with status ${initialResponse.status}`)
    return initialResponse
  }

  console.log('[x402] Got 402 Payment Required - payment proxy should handle this automatically')

  // Since we're now going through the payment proxy (8402), it should automatically
  // handle the x402 flow with Faremeter middleware. If we're getting a 402 here,
  // it means the payment proxy isn't working correctly.

  console.log('[x402] The payment proxy at 8402 should have handled this payment automatically')
  console.log('[x402] This 402 response suggests the payment proxy needs configuration')

  return initialResponse
}