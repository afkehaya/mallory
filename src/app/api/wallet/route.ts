import { NextRequest, NextResponse } from 'next/server'
import { getAddress, getDevBalance, fundDevWallet } from '@/lib/server/wallet'
import { Connection, PublicKey } from '@solana/web3.js'

export const runtime = 'nodejs'

// Create connection to Solana mainnet
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')

// USDC mint address on mainnet
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

async function getRealSolanaBalances(address: string) {
  try {
    const publicKey = new PublicKey(address)

    // Get SOL balance
    const solBalance = await connection.getBalance(publicKey)
    const solInSol = solBalance / 1e9 // Convert lamports to SOL

    // Get USDC balance
    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      mint: USDC_MINT
    })

    let usdcBalance = 0
    if (tokenAccounts.value.length > 0) {
      const accountInfo = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey)
      usdcBalance = parseFloat(accountInfo.value.uiAmount || '0')
    }

    return {
      SOL: parseFloat(solInSol.toFixed(4)),
      USDC: parseFloat(usdcBalance.toFixed(2))
    }
  } catch (error) {
    console.error('[wallet] Failed to get real balances:', error)
    // Fallback to dev balances for development
    return await getDevBalance()
  }
}

export async function GET() {
  try {
    const address = await getAddress()
    const balances = await getRealSolanaBalances(address)

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