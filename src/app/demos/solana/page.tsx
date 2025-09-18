'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, ArrowLeft, Database, Hash, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type QueryType = 'balance' | 'signatures' | 'transaction'

interface QueryResult {
  type: QueryType
  data: any
  error?: string
}

export default function SolanaDemoPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [address, setAddress] = useState('')
  const [signature, setSignature] = useState('')
  const [limit, setLimit] = useState('5')
  const [queryType, setQueryType] = useState<QueryType>('balance')
  const [loading_query, setLoadingQuery] = useState(false)
  const [results, setResults] = useState<QueryResult[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/auth/login')
    }
  }, [mounted, loading, user, router])

  const executeQuery = async () => {
    if (queryType === 'transaction' && !signature.trim()) return
    if ((queryType === 'balance' || queryType === 'signatures') && !address.trim()) return

    setLoadingQuery(true)

    try {
      let url = ''
      switch (queryType) {
        case 'balance':
          url = `/api/solana/balance?address=${encodeURIComponent(address.trim())}`
          break
        case 'signatures':
          url = `/api/solana/signatures?address=${encodeURIComponent(address.trim())}&limit=${encodeURIComponent(limit)}`
          break
        case 'transaction':
          url = `/api/solana/transaction?signature=${encodeURIComponent(signature.trim())}`
          break
      }

      const response = await fetch(url)
      const data = await response.json()

      const result: QueryResult = {
        type: queryType,
        data: response.ok ? data : null,
        error: response.ok ? undefined : data.error || 'Request failed',
      }

      setResults(prev => [result, ...prev.slice(0, 4)]) // Keep last 5 results
    } catch (error) {
      const result: QueryResult = {
        type: queryType,
        data: null,
        error: error instanceof Error ? error.message : 'Network error',
      }
      setResults(prev => [result, ...prev.slice(0, 4)])
    }

    setLoadingQuery(false)
  }

  const loadMalloryWallet = async () => {
    try {
      const response = await fetch('/api/wallet')
      if (response.ok) {
        const data = await response.json()
        setAddress(data.address)
      }
    } catch (error) {
      console.error('Failed to load Mallory wallet:', error)
    }
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
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-400 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Solana MCP Demo</h1>
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
            Make sure the MCP Solana server is running on{' '}
            <code className="bg-black/20 px-1 rounded">localhost:8765</code>
          </p>
        </motion.div>

        {/* Query Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl mb-6"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>Solana Queries</span>
          </h2>

          <div className="space-y-4">
            {/* Query Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Query Type</label>
              <select
                value={queryType}
                onChange={(e) => setQueryType(e.target.value as QueryType)}
                className="w-full p-3 bg-black/20 border border-white/10 rounded-lg focus:border-purple-400 focus:outline-none text-white"
              >
                <option value="balance">Get Balance</option>
                <option value="signatures">Get Signatures</option>
                <option value="transaction">Get Transaction</option>
              </select>
            </div>

            {/* Address Input */}
            {(queryType === 'balance' || queryType === 'signatures') && (
              <div>
                <label className="block text-sm font-medium mb-2">Wallet Address</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter Solana wallet address"
                    className="flex-1 p-3 bg-black/20 border border-white/10 rounded-lg focus:border-purple-400 focus:outline-none text-white placeholder-gray-400"
                  />
                  <button
                    onClick={loadMalloryWallet}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-all duration-300 text-sm"
                  >
                    Use Mallory
                  </button>
                </div>
              </div>
            )}

            {/* Signature Input */}
            {queryType === 'transaction' && (
              <div>
                <label className="block text-sm font-medium mb-2">Transaction Signature</label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Enter transaction signature"
                  className="w-full p-3 bg-black/20 border border-white/10 rounded-lg focus:border-purple-400 focus:outline-none text-white placeholder-gray-400"
                />
              </div>
            )}

            {/* Limit Input */}
            {queryType === 'signatures' && (
              <div>
                <label className="block text-sm font-medium mb-2">Limit</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full p-3 bg-black/20 border border-white/10 rounded-lg focus:border-purple-400 focus:outline-none text-white"
                />
              </div>
            )}

            <button
              onClick={executeQuery}
              disabled={loading_query ||
                (queryType === 'transaction' && !signature.trim()) ||
                ((queryType === 'balance' || queryType === 'signatures') && !address.trim())
              }
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg hover:from-purple-400 hover:to-blue-400 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading_query ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Querying MCP...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Execute Query</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Results */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold">Query Results</h3>

            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border ${
                  result.error
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Hash className="w-4 h-4" />
                  <span className="text-sm font-medium capitalize">{result.type} Query</span>
                  <span className="text-xs text-muted-foreground">#{results.length - index}</span>
                </div>

                {result.error ? (
                  <p className="text-red-300 text-sm">{result.error}</p>
                ) : (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-purple-300 hover:text-purple-200">
                      View Response Data
                    </summary>
                    <pre className="mt-2 p-3 bg-black/20 rounded-lg text-xs overflow-auto max-h-64">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
        >
          <h3 className="text-sm font-semibold text-blue-300 mb-2">About MCP Solana</h3>
          <p className="text-sm text-blue-200">
            This demo connects to a local MCP (Model Context Protocol) server that provides Solana blockchain data.
            You can query balances, transaction signatures, and individual transactions from the Solana mainnet.
          </p>
        </motion.div>
      </div>
    </div>
  )
}