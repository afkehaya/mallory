'use client'

import { useState, useEffect } from 'react'
import { createSolanaWallet } from '@faremeter/wallet-solana'

interface WalletBalance {
  SOL: number
  USDC: number
}

interface FaremeterWallet {
  address: string | null
  balances: WalletBalance | null
  isConnected: boolean
  isLoading: boolean
  connect: () => Promise<void>
  disconnect: () => void
  getBalance: () => Promise<WalletBalance | null>
}

export function useFaremeterWallet(): FaremeterWallet {
  const [address, setAddress] = useState<string | null>(null)
  const [balances, setBalances] = useState<WalletBalance | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [wallet, setWallet] = useState<any>(null)

  useEffect(() => {
    // Initialize Faremeter wallet
    const initWallet = async () => {
      try {
        const solanaWallet = await createSolanaWallet({
          facilitatorURL: process.env.NEXT_PUBLIC_FACILITATOR_URL || 'https://facilitator.corbits.dev',
          network: 'mainnet-beta'
        })
        setWallet(solanaWallet)
      } catch (error) {
        console.error('Failed to initialize Faremeter wallet:', error)
      }
    }

    initWallet()
  }, [])

  const connect = async () => {
    if (!wallet) return

    setIsLoading(true)
    try {
      await wallet.connect()
      const walletAddress = await wallet.getAddress()
      setAddress(walletAddress)
      setIsConnected(true)

      // Get initial balance
      await getBalance()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = () => {
    if (wallet) {
      wallet.disconnect()
    }
    setAddress(null)
    setBalances(null)
    setIsConnected(false)
  }

  const getBalance = async (): Promise<WalletBalance | null> => {
    if (!wallet || !address) return null

    try {
      const balance = await wallet.getBalance(address)
      const formattedBalance = {
        SOL: parseFloat((balance.SOL || 0).toFixed(4)),
        USDC: parseFloat((balance.USDC || 0).toFixed(2))
      }
      setBalances(formattedBalance)
      return formattedBalance
    } catch (error) {
      console.error('Failed to get wallet balance:', error)
      return null
    }
  }

  return {
    address,
    balances,
    isConnected,
    isLoading,
    connect,
    disconnect,
    getBalance
  }
}