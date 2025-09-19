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

  console.log('[x402] Got 402 Payment Required - processing payment...')

  try {
    // Parse the 402 response to get payment instructions
    const responseText = await initialResponse.text()
    console.log('[x402] Raw 402 response:', responseText)

    let x402Response: any
    try {
      x402Response = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[x402] Failed to parse 402 response as JSON:', parseError)
      return new Response(responseText, { status: initialResponse.status, headers: initialResponse.headers })
    }

    console.log('[x402] Parsed 402 response:', x402Response)

    // The response might be structured differently than expected
    // Check for various possible formats
    const paymentInstructions = x402Response.payment_instructions || x402Response.paymentInstructions || x402Response
    console.log('[x402] Payment instructions:', paymentInstructions)

    if (!paymentInstructions || !paymentInstructions.payment_url) {
      console.error('[x402] No valid payment instructions in 402 response')
      console.log('[x402] Expected payment_url field not found')

      // If the Amazon proxy supports x402 but doesn't provide payment instructions,
      // create our own payment instructions for the facilitator
      if (x402Response.x402Version) {
        console.log('[x402] Creating custom payment instructions for facilitator.corbits.dev')

        const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL
        if (!facilitatorUrl) {
          console.error('[x402] NEXT_PUBLIC_FACILITATOR_URL not configured')
          return new Response(responseText, { status: initialResponse.status, headers: initialResponse.headers })
        }

        // Create payment instructions that point to our facilitator
        const customPaymentInstructions = {
          payment_url: `${facilitatorUrl}/payment`,
          amount: 169.99, // AirPods price in USDC
          currency: 'USDC',
          recipient_address: 'GK9Bu3wSu7M9Yg2dNrtuFsymu8GMCn6f7BeLQZHxcPA7', // PAYTO_ADDRESS from config
          memo: 'Amazon AirPods Purchase',
          resource: url,
          description: 'Purchase payment via Faremeter'
        }

        console.log('[x402] Using custom payment instructions:', customPaymentInstructions)

        // Continue with payment flow using our custom instructions
        const wallet = await getWallet()
        const senderAddress = wallet.publicKey.toBase58()
        console.log(`[x402] Making payment from wallet: ${senderAddress}`)

        const paymentRequest: FacilitatorPaymentRequest = {
          payment_url: customPaymentInstructions.payment_url,
          sender_address: senderAddress,
        }

        console.log(`[x402] Submitting payment to facilitator: ${facilitatorUrl}`)
        const paymentResponse = await fetch(`${facilitatorUrl}/payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentRequest),
        })

        if (!paymentResponse.ok) {
          const errorText = await paymentResponse.text()
          console.error('[x402] Payment failed:', errorText)
          return new Response(responseText, { status: initialResponse.status, headers: initialResponse.headers })
        }

        const paymentResult = await paymentResponse.json()
        console.log('[x402] Payment successful:', paymentResult)

        // Retry the original request with payment proof
        console.log('[x402] Retrying original request with payment proof...')
        const retryResponse = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Payment-Signature': paymentResult.signature || '',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        })

        console.log(`[x402] Retry completed with status ${retryResponse.status}`)
        return retryResponse
      }

      return new Response(responseText, { status: initialResponse.status, headers: initialResponse.headers })
    }

    // Get our wallet address for making the payment
    const wallet = await getWallet()
    const senderAddress = wallet.publicKey.toBase58()
    console.log(`[x402] Making payment from wallet: ${senderAddress}`)

    // Make payment request to Faremeter facilitator
    const facilitatorUrl = process.env.NEXT_PUBLIC_FACILITATOR_URL
    if (!facilitatorUrl) {
      console.error('[x402] NEXT_PUBLIC_FACILITATOR_URL not configured')
      return initialResponse
    }

    const paymentRequest: FacilitatorPaymentRequest = {
      payment_url: paymentInstructions.payment_url,
      sender_address: senderAddress,
    }

    console.log(`[x402] Submitting payment to facilitator: ${facilitatorUrl}`)
    const paymentResponse = await fetch(`${facilitatorUrl}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentRequest),
    })

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      console.error('[x402] Payment failed:', errorText)
      return initialResponse
    }

    const paymentResult = await paymentResponse.json()
    console.log('[x402] Payment successful:', paymentResult)

    // Retry the original request with payment proof
    console.log('[x402] Retrying original request with payment proof...')
    const retryResponse = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Signature': paymentResult.signature || '',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    console.log(`[x402] Retry completed with status ${retryResponse.status}`)
    return retryResponse

  } catch (error) {
    console.error('[x402] Error processing payment:', error)
    return initialResponse
  }
}