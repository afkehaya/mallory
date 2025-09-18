import { NextRequest, NextResponse } from 'next/server'
import { x402Fetch } from '@/lib/server/x402'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { sku, quantity = 1 } = await request.json()

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU is required' },
        { status: 400 }
      )
    }

    const amazonProxyUrl = process.env.NEXT_PUBLIC_AMAZON_PROXY_URL
    if (!amazonProxyUrl) {
      return NextResponse.json(
        { error: 'Amazon proxy not configured' },
        { status: 500 }
      )
    }

    console.log(`[api/amazon/purchase] Purchasing SKU: ${sku}, Quantity: ${quantity}`)

    // Make request to Amazon proxy via x402 handler
    const response = await x402Fetch({
      url: `${amazonProxyUrl}/purchase`,
      method: 'POST',
      body: {
        sku,
        quantity,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[api/amazon/purchase] Purchase failed:', errorText)
      return NextResponse.json(
        { error: 'Purchase failed', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log('[api/amazon/purchase] Purchase successful:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/amazon/purchase] Error:', error)
    return NextResponse.json(
      { error: 'Purchase request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}