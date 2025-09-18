import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const signature = searchParams.get('signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature parameter is required' },
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

    console.log(`[api/solana/transaction] Getting transaction: ${signature}`)

    const url = `${mcpSolanaUrl}/transaction?signature=${encodeURIComponent(signature)}`
    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[api/solana/transaction] MCP request failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to get transaction from MCP server', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/solana/transaction] Error:', error)
    return NextResponse.json(
      { error: 'Transaction request failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}