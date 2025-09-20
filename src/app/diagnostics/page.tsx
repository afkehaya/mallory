'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Stethoscope,
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Bug,
  ShoppingCart,
  Wallet,
  Zap
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchAccepts,
  chooseScheme,
  FaremeterError,
  EmptyAcceptsError,
  UnsupportedSchemeError
} from '@/lib/faremeter'
import { healthEndpoints, paymentConfig, validatePaymentSetup } from '@/config/payments'
import { validateProductForTesting, getRandomTestProduct, TEST_ASINS } from '@/config/testAsins'

interface DiagnosticTest {
  id: string
  name: string
  description: string
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning'
  error?: string
  details?: any
  duration?: number
}

export default function DiagnosticsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [tests, setTests] = useState<DiagnosticTest[]>([
    {
      id: 'config',
      name: 'Configuration Validation',
      description: 'Verify all environment variables and configuration',
      status: 'pending'
    },
    {
      id: 'facilitator-health',
      name: 'Facilitator Health Check',
      description: 'Test connection to Faremeter facilitator',
      status: 'pending'
    },
    {
      id: 'accepts-probe',
      name: 'Accepts Header Probe',
      description: 'Call a known 402 endpoint and validate accepts response',
      status: 'pending'
    },
    {
      id: 'scheme-selection',
      name: 'Payment Scheme Selection',
      description: 'Test scheme preference logic with various accepts arrays',
      status: 'pending'
    },
    {
      id: 'wallet-connection',
      name: 'Wallet Connection Test',
      description: 'Verify wallet service is accessible and functional',
      status: 'pending'
    },
    {
      id: 'product-eligibility',
      name: 'Product Eligibility Check',
      description: 'Test product validation for known-good ASINs',
      status: 'pending'
    },
    {
      id: 'dry-run-signing',
      name: 'Dry-run Transaction Signing',
      description: 'Test transaction preparation without broadcasting',
      status: 'pending'
    }
  ])
  const [running, setRunning] = useState(false)
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed'>('idle')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/auth/login')
    }
  }, [mounted, loading, user, router])

  const updateTest = (id: string, updates: Partial<DiagnosticTest>) => {
    setTests(prev => prev.map(test =>
      test.id === id ? { ...test, ...updates } : test
    ))
  }

  const runTest = async (test: DiagnosticTest): Promise<void> => {
    const startTime = Date.now()
    updateTest(test.id, { status: 'running', error: undefined, details: undefined })

    try {
      switch (test.id) {
        case 'config':
          await testConfiguration()
          break
        case 'facilitator-health':
          await testFacilitatorHealth()
          break
        case 'accepts-probe':
          await testAcceptsProbe()
          break
        case 'scheme-selection':
          await testSchemeSelection()
          break
        case 'wallet-connection':
          await testWalletConnection()
          break
        case 'product-eligibility':
          await testProductEligibility()
          break
        case 'dry-run-signing':
          await testDryRunSigning()
          break
        default:
          throw new Error('Unknown test')
      }

      updateTest(test.id, {
        status: 'passed',
        duration: Date.now() - startTime
      })
    } catch (error) {
      console.error(`Test ${test.id} failed:`, error)
      updateTest(test.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof FaremeterError ? error.details : undefined,
        duration: Date.now() - startTime
      })
    }
  }

  const testConfiguration = async (): Promise<void> => {
    const status = validatePaymentSetup()

    if (!status.valid) {
      throw new Error(`Configuration validation failed: ${status.errors.join(', ')}`)
    }

    updateTest('config', {
      details: {
        facilitatorUrl: paymentConfig.facilitatorUrl,
        scheme: paymentConfig.scheme,
        network: paymentConfig.network,
        amazonProxyUrl: paymentConfig.amazonProxyUrl,
        paymentProxyUrl: paymentConfig.paymentProxyUrl
      }
    })
  }

  const testFacilitatorHealth = async (): Promise<void> => {
    const response = await fetch(healthEndpoints.facilitator, {
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Facilitator health check failed: HTTP ${response.status}`)
    }

    const data = await response.json()
    updateTest('facilitator-health', {
      details: data
    })
  }

  const testAcceptsProbe = async (): Promise<void> => {
    // Test against a known endpoint that should return 402
    const testEndpoint = `${paymentConfig.paymentProxyUrl}/purchase`

    try {
      const acceptsData = await fetchAccepts(testEndpoint)

      if (!acceptsData.accepts || acceptsData.accepts.length === 0) {
        throw new EmptyAcceptsError(testEndpoint)
      }

      updateTest('accepts-probe', {
        details: {
          endpoint: testEndpoint,
          accepts: acceptsData.accepts,
          count: acceptsData.accepts.length
        }
      })
    } catch (error) {
      if (error instanceof EmptyAcceptsError) {
        throw error
      }

      // If the endpoint doesn't return 402, that's also valuable info
      updateTest('accepts-probe', {
        status: 'warning',
        error: 'Endpoint may not require payment or may be misconfigured',
        details: {
          endpoint: testEndpoint,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      })
      return
    }
  }

  const testSchemeSelection = async (): Promise<void> => {
    const testCases = [
      {
        name: 'Preferred scheme available',
        accepts: ['x-solana-settlement', 'x-ethereum-settlement'],
        expected: 'x-solana-settlement'
      },
      {
        name: 'Fallback to second choice',
        accepts: ['x-ethereum-settlement', 'x-bitcoin-settlement'],
        expected: 'x-ethereum-settlement'
      },
      {
        name: 'Empty accepts array',
        accepts: [],
        expected: 'x-solana-settlement' // Default fallback
      },
      {
        name: 'Unknown schemes',
        accepts: ['unknown-scheme-1', 'unknown-scheme-2'],
        expected: 'unknown-scheme-1' // First available as fallback
      }
    ]

    const results = testCases.map(testCase => {
      const chosen = chooseScheme(testCase.accepts)
      return {
        ...testCase,
        actual: chosen,
        passed: chosen === testCase.expected
      }
    })

    const allPassed = results.every(r => r.passed)

    if (!allPassed) {
      throw new Error('Some scheme selection tests failed')
    }

    updateTest('scheme-selection', {
      details: { testResults: results }
    })
  }

  const testWalletConnection = async (): Promise<void> => {
    const response = await fetch('/api/wallet', { cache: 'no-store' })

    if (!response.ok) {
      throw new Error(`Wallet API error: HTTP ${response.status}`)
    }

    const data = await response.json()

    if (!data.address) {
      throw new Error('Wallet address not available')
    }

    updateTest('wallet-connection', {
      details: {
        address: data.address,
        balances: data.balances
      }
    })
  }

  const testProductEligibility = async (): Promise<void> => {
    const testResults = TEST_ASINS.slice(0, 3).map(product => {
      const validation = validateProductForTesting(product.asin)
      return {
        asin: product.asin,
        title: product.title,
        validation
      }
    })

    const eligibleCount = testResults.filter(r => r.validation.valid).length

    if (eligibleCount === 0) {
      throw new Error('No test products are eligible for testing')
    }

    updateTest('product-eligibility', {
      details: {
        tested: testResults.length,
        eligible: eligibleCount,
        results: testResults
      }
    })
  }

  const testDryRunSigning = async (): Promise<void> => {
    // This would test transaction preparation without actually sending
    // For now, we'll simulate this
    const randomProduct = getRandomTestProduct()

    updateTest('dry-run-signing', {
      status: 'warning',
      error: 'Dry-run signing not yet implemented',
      details: {
        testProduct: randomProduct,
        note: 'This test would prepare a transaction without broadcasting it'
      }
    })
  }

  const runAllTests = async () => {
    setRunning(true)
    setOverallStatus('running')

    // Reset all tests to pending
    setTests(prev => prev.map(test => ({
      ...test,
      status: 'pending' as const,
      error: undefined,
      details: undefined,
      duration: undefined
    })))

    // Run tests sequentially to avoid overwhelming services
    for (const test of tests) {
      await runTest(test)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setRunning(false)
    setOverallStatus('completed')
  }

  const getStatusIcon = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />
    }
  }

  const getStatusColor = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'passed':
        return 'border-green-500/20 bg-green-500/5'
      case 'failed':
        return 'border-red-500/20 bg-red-500/5'
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/5'
      case 'running':
        return 'border-blue-500/20 bg-blue-500/5'
      default:
        return 'border-gray-500/20 bg-gray-500/5'
    }
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

  const passedCount = tests.filter(t => t.status === 'passed').length
  const failedCount = tests.filter(t => t.status === 'failed').length
  const warningCount = tests.filter(t => t.status === 'warning').length

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
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Diagnostics</h1>
            </div>
          </div>
          <button
            onClick={runAllTests}
            disabled={running}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 rounded-xl font-semibold transition-colors flex items-center space-x-2"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Tests...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run All Tests</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Overview */}
        {overallStatus === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{passedCount}</div>
                  <div className="text-xs text-gray-400">Passed</div>
                </div>
                {warningCount > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{warningCount}</div>
                    <div className="text-xs text-gray-400">Warnings</div>
                  </div>
                )}
                {failedCount > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{failedCount}</div>
                    <div className="text-xs text-gray-400">Failed</div>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">
                  {failedCount === 0 ? 'All Core Tests Passed!' : 'Issues Detected'}
                </div>
                <div className="text-sm text-gray-400">
                  {tests.length} tests completed
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Test Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {tests.map((test, index) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={`p-4 rounded-xl border ${getStatusColor(test.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <h3 className="font-medium">{test.name}</h3>
                    <p className="text-sm text-gray-400">{test.description}</p>
                  </div>
                </div>
                {test.duration && (
                  <span className="text-xs text-gray-400">
                    {test.duration}ms
                  </span>
                )}
              </div>

              {test.error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-300">{test.error}</p>
                </div>
              )}

              {test.details && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                    View Details
                  </summary>
                  <pre className="mt-2 p-3 bg-black/20 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(test.details, null, 2)}
                  </pre>
                </details>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Troubleshooting */}
        {overallStatus === 'completed' && failedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"
          >
            <div className="flex items-center space-x-2 mb-3">
              <Bug className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold text-yellow-300">Troubleshooting</h3>
            </div>
            <ul className="text-sm text-yellow-200 space-y-1">
              <li>• Check that all proxy services are running (ports 8787, 8402)</li>
              <li>• Verify environment variables are set correctly</li>
              <li>• Ensure the facilitator URL is accessible</li>
              <li>• Try running: <code className="bg-black/20 px-1 rounded">npm run dev:clean && npm run dev:stack</code></li>
              <li>• Check network connectivity and firewall settings</li>
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  )
}