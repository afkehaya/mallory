'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShoppingCart, ArrowLeft, Package, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface PurchaseResult {
  orderId?: string
  status?: string
  message?: string
  error?: string
  details?: any
}

export default function AmazonDemoPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [sku, setSku] = useState('B00EXAMPLE')
  const [quantity, setQuantity] = useState(1)
  const [purchasing, setPurchasing] = useState(false)
  const [result, setResult] = useState<PurchaseResult | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/auth/login')
    }
  }, [mounted, loading, user, router])

  const handlePurchase = async () => {
    if (!sku.trim()) return

    setPurchasing(true)
    setResult(null)

    try {
      const response = await fetch('/api/amazon/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sku: sku.trim(),
          quantity,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setResult({
          error: data.error || 'Purchase failed',
          details: data.details,
        })
      }
    } catch (error) {
      setResult({
        error: 'Network error occurred',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    setPurchasing(false)
  }

  // Check if payments are enabled
  const paymentsEnabled = process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === 'true'

  if (!paymentsEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl">Payments are not enabled</p>
          <p className="text-muted-foreground mt-2">Set NEXT_PUBLIC_ENABLE_PAYMENTS=true to use demo features</p>
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
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-400 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Amazon Demo</h1>
            </div>
          </div>
        </motion.div>

        {/* Prerequisites Check */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"
        >
          <div className="flex items-center space-x-2 text-yellow-300">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Prerequisites</span>
          </div>
          <p className="mt-2 text-sm text-yellow-200">
            Make sure the Amazon Faremeter demo proxy is running on{' '}
            <code className="bg-black/20 px-1 rounded">localhost:8787</code>
          </p>
        </motion.div>

        {/* Purchase Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl mb-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Purchase Item</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g., B00EXAMPLE"
                className="w-full p-3 bg-black/20 border border-white/10 rounded-lg focus:border-teal-400 focus:outline-none text-white placeholder-gray-400"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Use a hardcoded demo SKU like <code className="bg-black/20 px-1 rounded">B00EXAMPLE</code>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-3 bg-black/20 border border-white/10 rounded-lg focus:border-teal-400 focus:outline-none text-white"
              />
            </div>

            <button
              onClick={handlePurchase}
              disabled={purchasing || !sku.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg hover:from-orange-400 hover:to-red-400 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {purchasing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                  <span>Processing x402 Payment...</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  <span>Purchase via x402</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Result Display */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-2xl border ${
              result.error
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-green-500/10 border-green-500/20'
            }`}
          >
            <div className="flex items-center space-x-2 mb-4">
              {result.error ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              <h3 className="text-lg font-semibold">
                {result.error ? 'Purchase Failed' : 'Purchase Successful'}
              </h3>
            </div>

            {result.error ? (
              <div className="space-y-2">
                <p className="text-red-300">{result.error}</p>
                {result.details && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-red-400">Details</summary>
                    <pre className="mt-2 p-3 bg-black/20 rounded-lg text-xs overflow-auto">
                      {typeof result.details === 'string' ? result.details : JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {result.orderId && (
                  <p className="text-green-300">
                    <strong>Order ID:</strong> {result.orderId}
                  </p>
                )}
                {result.status && (
                  <p className="text-green-300">
                    <strong>Status:</strong> {result.status}
                  </p>
                )}
                {result.message && (
                  <p className="text-green-300">{result.message}</p>
                )}
                <details className="text-sm">
                  <summary className="cursor-pointer text-green-400">Full Response</summary>
                  <pre className="mt-2 p-3 bg-black/20 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </motion.div>
        )}

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
        >
          <h3 className="text-sm font-semibold text-blue-300 mb-2">How it works</h3>
          <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
            <li>Request is sent to the Amazon proxy demo server</li>
            <li>Server responds with HTTP 402 Payment Required</li>
            <li>x402 handler processes payment via facilitator</li>
            <li>Original request is retried after payment settlement</li>
            <li>Purchase confirmation is returned</li>
          </ol>
        </motion.div>
      </div>
    </div>
  )
}