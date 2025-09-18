import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      )
    }

    const mcpSolanaUrl = process.env.NEXT_PUBLIC_MCP_SOLANA_URL
    if (!mcpSolanaUrl) {
      return NextResponse.json(
        { error: 'MCP Solana server not configured' },
        { status: 500 }
      )
    }

    console.log(`[api/solana/balance] Getting balance for address: ${address}`)

    const response = await fetch(`${mcpSolanaUrl}/balance?address=${encodeURIComponent(address)}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[api/solana/balance] MCP request failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to get balance from MCP server', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/solana/balance] Error:', error)
    return NextResponse.json(
      { error: 'Balance request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}