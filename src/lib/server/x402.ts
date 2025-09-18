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

  console.log('[x402] Got 402 Payment Required, processing payment instructions')

  // Parse 402 response
  let paymentData: X402Response
  try {
    paymentData = await initialResponse.json()
  } catch (error) {
    console.error('[x402] Failed to parse 402 response:', error)
    throw new Error('Invalid 402 response format')
  }

  if (!paymentData.payment_instructions) {
    console.error('[x402] No payment instructions in 402 response')
    throw new Error('No payment instructions provided')
  }

  const { payment_instructions } = paymentData
  console.log('[x402] Payment instructions:', payment_instructions)

  // Get wallet for payments
  const wallet = await getWallet()
  const walletAddress = wallet.publicKey.toBase58()

  // Prepare payment request to facilitator
  const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL
  if (!facilitatorUrl) {
    throw new Error('NEXT_PUBLIC_FACILITATOR_URL not configured')
  }

  const paymentRequest: FacilitatorPaymentRequest = {
    payment_url: payment_instructions.payment_url,
    sender_address: walletAddress,
  }

  console.log('[x402] Sending payment request to facilitator:', facilitatorUrl)

  // Submit payment to facilitator
  const facilitatorResponse = await fetch(`${facilitatorUrl}/submit-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentRequest),
  })

  if (!facilitatorResponse.ok) {
    const errorText = await facilitatorResponse.text()
    console.error('[x402] Facilitator payment failed:', errorText)
    throw new Error(`Payment processing failed: ${errorText}`)
  }

  const facilitatorResult = await facilitatorResponse.json()
  console.log('[x402] Payment processed successfully:', facilitatorResult)

  // Wait a moment for settlement
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Retry original request
  console.log('[x402] Retrying original request after payment')
  const finalResponse = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  console.log(`[x402] Final request completed with status ${finalResponse.status}`)
  return finalResponse
}