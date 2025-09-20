'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Heart,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Zap,
  Globe
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { healthEndpoints, validatePaymentSetup } from '@/config/payments'

interface HealthStatus {
  name: string
  url: string
  status: 'checking' | 'healthy' | 'unhealthy' | 'error'
  responseTime?: number
  error?: string
  lastChecked?: Date
  details?: any
}

export default function HealthPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [services, setServices] = useState<HealthStatus[]>([
    {
      name: 'Faremeter Facilitator',
      url: healthEndpoints.facilitator,
      status: 'checking'
    },
    {
      name: 'Amazon Proxy',
      url: healthEndpoints.amazonProxy,
      status: 'checking'
    },
    {
      name: 'Payment Proxy',
      url: healthEndpoints.paymentProxy,
      status: 'checking'
    }
  ])
  const [configStatus, setConfigStatus] = useState<{ valid: boolean; errors: string[] } | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    setMounted(true)
    checkConfiguration()
    checkAllServices()
  }, [])

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/auth/login')
    }
  }, [mounted, loading, user, router])

  const checkConfiguration = () => {
    try {
      const status = validatePaymentSetup()
      setConfigStatus(status)
    } catch (error) {
      setConfigStatus({
        valid: false,
        errors: [error instanceof Error ? error.message : 'Configuration validation failed']
      })
    }
  }

  const checkService = async (service: HealthStatus): Promise<HealthStatus> => {
    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch(service.url, {
        signal: controller.signal,
        cache: 'no-store'
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      return {
        ...service,
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        lastChecked: new Date(),
        error: response.ok ? undefined : `HTTP ${response.status}`,
        details: response.ok ? await response.json().catch(() => null) : null
      }
    } catch (error) {
      const responseTime = Date.now() - startTime

      return {
        ...service,
        status: 'error',
        responseTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const checkAllServices = async () => {
    setLastRefresh(new Date())

    // Reset all to checking state
    setServices(prev => prev.map(s => ({ ...s, status: 'checking' as const })))

    // Check all services in parallel
    const promises = services.map(checkService)
    const results = await Promise.all(promises)

    setServices(results)
  }

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'unhealthy':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500/20 bg-green-500/10'
      case 'unhealthy':
        return 'border-yellow-500/20 bg-yellow-500/10'
      case 'error':
        return 'border-red-500/20 bg-red-500/10'
      case 'checking':
        return 'border-blue-500/20 bg-blue-500/10'
      default:
        return 'border-gray-500/20 bg-gray-500/10'
    }
  }

  const getServiceIcon = (name: string) => {
    if (name.includes('Facilitator')) return <Zap className="w-5 h-5" />
    if (name.includes('Amazon')) return <Globe className="w-5 h-5" />
    if (name.includes('Payment')) return <Server className="w-5 h-5" />
    return <Server className="w-5 h-5" />
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

  const overallHealthy = services.every(s => s.status === 'healthy') && configStatus?.valid

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
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                overallHealthy
                  ? 'bg-gradient-to-br from-green-400 to-green-500'
                  : 'bg-gradient-to-br from-red-400 to-red-500'
              }`}>
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-heading font-bold">System Health</h1>
            </div>
          </div>
          <button
            onClick={checkAllServices}
            className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 transition-all duration-300 flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </motion.div>

        {/* Overall Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-2xl border mb-6 ${
            overallHealthy
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          <div className="flex items-center space-x-3">
            {overallHealthy ? (
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <h2 className="text-lg font-semibold">
                System Status: {overallHealthy ? 'All Systems Operational' : 'Issues Detected'}
              </h2>
              <p className="text-sm text-gray-300">
                Last checked: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Configuration Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <div className={`p-4 rounded-xl border ${
            configStatus?.valid
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center space-x-2">
              {configStatus?.valid ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className="font-medium">
                {configStatus?.valid ? 'Configuration Valid' : 'Configuration Issues'}
              </span>
            </div>
            {configStatus?.errors && configStatus.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {configStatus.errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-300">• {error}</p>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Services Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold mb-4">Services</h2>
          <div className="grid gap-4">
            {services.map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className={`p-4 rounded-xl border ${getStatusColor(service.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getServiceIcon(service.name)}
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-sm text-gray-400">{service.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {service.responseTime && (
                      <span className="text-sm text-gray-400">
                        {service.responseTime}ms
                      </span>
                    )}
                    {getStatusIcon(service.status)}
                  </div>
                </div>
                {service.error && (
                  <div className="mt-3 p-3 bg-black/20 rounded-lg">
                    <p className="text-sm text-red-300">{service.error}</p>
                  </div>
                )}
                {service.details && (
                  <details className="mt-3">
                    <summary className="text-sm cursor-pointer text-gray-400">Response Details</summary>
                    <pre className="mt-2 p-3 bg-black/20 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(service.details, null, 2)}
                    </pre>
                  </details>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Remediation Steps */}
        {!overallHealthy && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"
          >
            <h3 className="font-semibold text-yellow-300 mb-2">Remediation Steps</h3>
            <ul className="text-sm text-yellow-200 space-y-1">
              <li>• Ensure all proxy services are running (check ports 8787, 8402)</li>
              <li>• Verify environment variables are correctly set</li>
              <li>• Check that the facilitator URL is accessible</li>
              <li>• Run: <code className="bg-black/20 px-1 rounded">pnpm dev:stack</code> to start all services</li>
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  )
}