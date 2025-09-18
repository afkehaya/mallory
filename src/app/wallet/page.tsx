'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Copy, Wallet, Plus, ArrowLeft, DollarSign } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface WalletInfo {
  address: string
  balances: {
    SOL: number
    USDC: number
  }
}

export default function WalletPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [fundingAmount, setFundingAmount] = useState('')
  const [fundingCurrency, setFundingCurrency] = useState<'SOL' | 'USDC'>('USDC')
  const [fundingLoading, setFundingLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/auth/login')
    }
  }, [mounted, loading, user, router])

  useEffect(() => {
    if (mounted && user) {
      loadWalletInfo()
    }
  }, [mounted, user])

  const loadWalletInfo = async () => {
    setLoadingWallet(true)
    try {
      const response = await fetch('/api/wallet')
      if (response.ok) {
        const data = await response.json()
        setWalletInfo(data)
      }
    } catch (error) {
      console.error('Failed to load wallet info:', error)
    }
    setLoadingWallet(false)
  }

  const copyAddress = async () => {
    if (walletInfo?.address) {
      await navigator.clipboard.writeText(walletInfo.address)
    }
  }

  const handleFund = async () => {
    if (!fundingAmount || isNaN(Number(fundingAmount))) return

    setFundingLoading(true)
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fund',
          amount: Number(fundingAmount),
          currency: fundingCurrency,
        }),
      })

      if (response.ok) {
        setFundingAmount('')
        await loadWalletInfo()
      }
    } catch (error) {
      console.error('Failed to fund wallet:', error)
    }
    setFundingLoading(false)
  }

  // Check if payments are enabled
  const paymentsEnabled = process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === 'true'

  if (!paymentsEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl">Payments are not enabled</p>
          <p className="text-muted-foreground mt-2">Set NEXT_PUBLIC_ENABLE_PAYMENTS=true to use wallet features</p>
        </div>
      </div>
    )
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-400"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/chat')}
              className="p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-violet-400 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Mallory Wallet</h1>
            </div>
          </div>
        </motion.div>

        {/* Wallet Info */}
        {loadingWallet ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-teal-400"></div>
          </div>
        ) : walletInfo ? (
          <div className="space-y-6">
            {/* Address Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl"
            >
              <h2 className="text-lg font-semibold mb-4">Wallet Address</h2>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-3 bg-black/20 rounded-lg text-sm font-mono text-teal-300 break-all">
                  {walletInfo.address}
                </code>
                <button
                  onClick={copyAddress}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300"
                  title="Copy address"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

            {/* Balances Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl"
            >
              <h2 className="text-lg font-semibold mb-4">Balances (Dev Mode)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl border border-orange-500/20">
                  <div className="text-sm text-orange-300">SOL</div>
                  <div className="text-xl font-bold">{walletInfo.balances.SOL}</div>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-blue-500/20">
                  <div className="text-sm text-blue-300">USDC</div>
                  <div className="text-xl font-bold">{walletInfo.balances.USDC}</div>
                </div>
              </div>
            </motion.div>

            {/* Funding Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl"
            >
              <h2 className="text-lg font-semibold mb-4">Fund Wallet (Dev Mode)</h2>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <input
                    type="number"
                    value={fundingAmount}
                    onChange={(e) => setFundingAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 p-3 bg-black/20 border border-white/10 rounded-lg focus:border-teal-400 focus:outline-none text-white placeholder-gray-400"
                  />
                  <select
                    value={fundingCurrency}
                    onChange={(e) => setFundingCurrency(e.target.value as 'SOL' | 'USDC')}
                    className="p-3 bg-black/20 border border-white/10 rounded-lg focus:border-teal-400 focus:outline-none text-white"
                  >
                    <option value="USDC">USDC</option>
                    <option value="SOL">SOL</option>
                  </select>
                  <button
                    onClick={handleFund}
                    disabled={fundingLoading || !fundingAmount}
                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-violet-500 rounded-lg hover:from-teal-400 hover:to-violet-400 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {fundingLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Fund</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is development mode funding. In production, this would connect to a real payment processor.
                </p>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground">Failed to load wallet information</p>
            <button
              onClick={loadWalletInfo}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-teal-500 to-violet-500 rounded-lg hover:from-teal-400 hover:to-violet-400 transition-all duration-300 font-semibold"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}