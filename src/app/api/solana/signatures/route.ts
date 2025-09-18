import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const limit = searchParams.get('limit') || '10'

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

    console.log(`[api/solana/signatures] Getting signatures for address: ${address}, limit: ${limit}`)

    const url = `${mcpSolanaUrl}/signatures?address=${encodeURIComponent(address)}&limit=${encodeURIComponent(limit)}`
    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[api/solana/signatures] MCP request failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to get signatures from MCP server', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/solana/signatures] Error:', error)
    return NextResponse.json(
      { error: 'Signatures request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}