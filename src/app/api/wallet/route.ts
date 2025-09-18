import { NextRequest, NextResponse } from 'next/server'
import { getAddress, getDevBalance, fundDevWallet } from '@/lib/server/wallet'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const address = await getAddress()
    const balances = await getDevBalance()

    return NextResponse.json({
      address,
      balances,
    })
  } catch (error) {
    console.error('[api/wallet] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to get wallet info' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, amount, currency } = await request.json()

    if (action === 'fund') {
      if (!amount || !currency) {
        return NextResponse.json(
          { error: 'Amount and currency required for funding' },
          { status: 400 }
        )
      }

      if (!['SOL', 'USDC'].includes(currency)) {
        return NextResponse.json(
          { error: 'Currency must be SOL or USDC' },
          { status: 400 }
        )
      }

      const balances = await fundDevWallet(amount, currency)

      return NextResponse.json({
        success: true,
        message: `Funded ${amount} ${currency}`,
        balances,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[api/wallet] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process wallet action' },
      { status: 500 }
    )
  }
}