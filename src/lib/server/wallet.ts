import { Keypair } from '@solana/web3.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const WALLET_FILE = '.wallet.json'
const WALLET_PATH = join(process.cwd(), WALLET_FILE)

interface WalletData {
  secretKey: number[]
  publicKey: string
  address: string
}

let cachedWallet: Keypair | null = null

export async function getWallet(): Promise<Keypair> {
  if (cachedWallet) {
    return cachedWallet
  }

  // Try to load from environment variable first
  const secretBase58 = process.env.MALLORY_WALLET_SECRET_BASE58
  if (secretBase58) {
    try {
      const secretKey = Uint8Array.from(Buffer.from(secretBase58, 'base64'))
      cachedWallet = Keypair.fromSecretKey(secretKey)
      console.log('[wallet] Loaded wallet from environment variable')
      return cachedWallet
    } catch (error) {
      console.error('[wallet] Failed to load wallet from env var:', error)
    }
  }

  // Try to load from file
  if (existsSync(WALLET_PATH)) {
    try {
      const walletData: WalletData = JSON.parse(readFileSync(WALLET_PATH, 'utf8'))
      const secretKey = Uint8Array.from(walletData.secretKey)
      cachedWallet = Keypair.fromSecretKey(secretKey)
      console.log('[wallet] Loaded existing wallet from file:', walletData.address)
      return cachedWallet
    } catch (error) {
      console.error('[wallet] Failed to load wallet from file:', error)
    }
  }

  // Generate new wallet and save to file
  console.log('[wallet] Generating new development wallet')
  cachedWallet = Keypair.generate()

  const walletData: WalletData = {
    secretKey: Array.from(cachedWallet.secretKey),
    publicKey: cachedWallet.publicKey.toBase58(),
    address: cachedWallet.publicKey.toBase58(),
  }

  try {
    writeFileSync(WALLET_PATH, JSON.stringify(walletData, null, 2))
    console.log('[wallet] Saved new wallet to file:', walletData.address)
  } catch (error) {
    console.error('[wallet] Failed to save wallet to file:', error)
  }

  return cachedWallet
}

export async function getAddress(): Promise<string> {
  const wallet = await getWallet()
  return wallet.publicKey.toBase58()
}

// Dev-only balance tracking (since we're not using real Solana RPC)
interface DevBalance {
  SOL: number
  USDC: number
}

const DEV_BALANCES_FILE = '.dev-balances.json'
const DEV_BALANCES_PATH = join(process.cwd(), DEV_BALANCES_FILE)

export async function getDevBalance(): Promise<DevBalance> {
  if (existsSync(DEV_BALANCES_PATH)) {
    try {
      return JSON.parse(readFileSync(DEV_BALANCES_PATH, 'utf8'))
    } catch (error) {
      console.error('[wallet] Failed to load dev balances:', error)
    }
  }

  // Default balances
  const defaultBalance: DevBalance = { SOL: 0, USDC: 0 }
  await saveDevBalance(defaultBalance)
  return defaultBalance
}

export async function saveDevBalance(balance: DevBalance): Promise<void> {
  try {
    writeFileSync(DEV_BALANCES_PATH, JSON.stringify(balance, null, 2))
  } catch (error) {
    console.error('[wallet] Failed to save dev balances:', error)
  }
}

export async function fundDevWallet(amount: number, currency: 'SOL' | 'USDC'): Promise<DevBalance> {
  const balance = await getDevBalance()
  balance[currency] += amount
  await saveDevBalance(balance)
  console.log(`[wallet] Funded ${amount} ${currency}, new balance:`, balance)
  return balance
}