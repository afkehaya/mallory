import { NextRequest, NextResponse } from 'next/server'
import { executeX402Flow } from '@/lib/faremeter'
import { paymentConfig } from '@/config/payments'

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

    console.log(`[api/amazon/purchase] Purchasing SKU: ${sku}, Quantity: ${quantity}`)

    // First, get product data from Amazon proxy
    const searchUrl = new URL(`${paymentConfig.amazonProxyUrl}/products`)
    searchUrl.searchParams.set('search', sku)
    searchUrl.searchParams.set('limit', '1')

    const searchResponse = await fetch(searchUrl.toString())
    if (!searchResponse.ok) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const searchData = await searchResponse.json()
    const product = searchData.products?.find((p: any) => p.product?.asin === sku)

    if (!product || !product.productBlob || !product.signature) {
      return NextResponse.json(
        { error: 'Product not found or missing required data' },
        { status: 404 }
      )
    }

    // Use the exact x402 implementation
    const response = await executeX402Flow(`${paymentConfig.paymentProxyUrl}/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mallory/1.0',
      },
      body: {
        productBlob: product.productBlob,
        signature: product.signature,
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