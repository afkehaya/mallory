'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Settings,
  ArrowLeft,
  Server,
  Globe,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { healthEndpoints, paymentConfig, validatePaymentSetup } from '@/config/payments'

interface ServiceStatus {
  name: string
  url: string
  status: 'checking' | 'healthy' | 'unhealthy' | 'error'
  responseTime?: number
  error?: string
  lastChecked?: Date
}

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [configStatus, setConfigStatus] = useState<{ valid: boolean; errors: string[] } | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    checkConfiguration()
    checkServices()

    // Auto-refresh every 30 seconds
    const interval = setInterval(checkServices, 30000)
    return () => clearInterval(interval)
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

  const checkServices = async () => {
    const serviceList = [
      { name: 'Facilitator', url: healthEndpoints.facilitator, icon: Zap },
      { name: 'Amazon Proxy', url: healthEndpoints.amazonProxy, icon: Globe },
      { name: 'Payment Proxy', url: healthEndpoints.paymentProxy, icon: Server },
    ]

    const newServices: ServiceStatus[] = serviceList.map(s => ({
      name: s.name,
      url: s.url,
      status: 'checking'
    }))

    setServices(newServices)

    // Check each service
    const promises = serviceList.map(async (service, index) => {
      const startTime = Date.now()
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(service.url, {
          signal: controller.signal,
          cache: 'no-store'
        })

        clearTimeout(timeoutId)
        const responseTime = Date.now() - startTime

        return {
          ...newServices[index],
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime,
          lastChecked: new Date(),
          error: response.ok ? undefined : `HTTP ${response.status}`
        } as ServiceStatus
      } catch (error) {
        const responseTime = Date.now() - startTime
        return {
          ...newServices[index],
          status: 'error',
          responseTime,
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : 'Connection failed'
        } as ServiceStatus
      }
    })

    const results = await Promise.all(promises)
    setServices(results)
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const maskSecret = (secret: string | undefined): string => {
    if (!secret) return 'Not set'
    if (showSecrets) return secret
    return secret.substring(0, 8) + '...' + secret.substring(secret.length - 4)
  }

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'checking':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'unhealthy':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />
    }
  }

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500/20 bg-green-500/5'
      case 'unhealthy':
        return 'border-yellow-500/20 bg-yellow-500/5'
      case 'error':
        return 'border-red-500/20 bg-red-500/5'
      case 'checking':
        return 'border-blue-500/20 bg-blue-500/5'
      default:
        return 'border-gray-500/20 bg-gray-500/5'
    }
  }

  const getServiceIcon = (name: string) => {
    if (name.includes('Facilitator')) return <Zap className="w-4 h-4" />
    if (name.includes('Amazon')) return <Globe className="w-4 h-4" />
    if (name.includes('Payment')) return <Server className="w-4 h-4" />
    return <Server className="w-4 h-4" />
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

  const allHealthy = services.every(s => s.status === 'healthy') && configStatus?.valid

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
                <Settings className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-heading font-bold">Settings</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href="/health"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl hover:bg-white/20 transition-all duration-300 flex items-center space-x-2"
            >
              <span>Full Diagnostics</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>

        {/* Stack Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center space-x-2">
                <Server className="w-5 h-5" />
                <span>Stack Status</span>
              </h2>
              <button
                onClick={checkServices}
                className="px-3 py-1 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Overall Status */}
            <div className={`p-4 rounded-xl border mb-4 ${
              allHealthy
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div className="flex items-center space-x-2">
                {allHealthy ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="font-medium">
                  {allHealthy ? 'All Systems Operational' : 'Issues Detected'}
                </span>
              </div>
            </div>

            {/* Service List */}
            <div className="space-y-3">
              {services.map((service, index) => (
                <div
                  key={service.name}
                  className={`p-3 rounded-lg border ${getStatusColor(service.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getServiceIcon(service.name)}
                      <div>
                        <span className="font-medium">{service.name}</span>
                        <p className="text-xs text-gray-400">{service.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {service.responseTime && (
                        <span className="text-xs text-gray-400">
                          {service.responseTime}ms
                        </span>
                      )}
                      {getStatusIcon(service.status)}
                    </div>
                  </div>
                  {service.error && (
                    <p className="text-xs text-red-300 mt-2">{service.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Configuration</h2>
              <button
                onClick={() => setShowSecrets(!showSecrets)}
                className="px-3 py-1 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-colors flex items-center space-x-1"
              >
                {showSecrets ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showSecrets ? 'Hide' : 'Show'} Secrets</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Configuration Status */}
              <div className={`p-3 rounded-lg border ${
                configStatus?.valid
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-center space-x-2">
                  {configStatus?.valid ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="font-medium">
                    {configStatus?.valid ? 'Configuration Valid' : 'Configuration Issues'}
                  </span>
                </div>
                {configStatus?.errors && configStatus.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {configStatus.errors.map((error, index) => (
                      <p key={index} className="text-xs text-red-300">• {error}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Key Configuration Values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Facilitator URL
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-black/20 px-2 py-1 rounded flex-1">
                        {paymentConfig.facilitatorUrl}
                      </code>
                      <button
                        onClick={() => copyToClipboard(paymentConfig.facilitatorUrl, 'facilitator-url')}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Payment Scheme
                    </label>
                    <code className="text-xs bg-black/20 px-2 py-1 rounded block">
                      {paymentConfig.scheme}
                    </code>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Network
                    </label>
                    <code className="text-xs bg-black/20 px-2 py-1 rounded block">
                      {paymentConfig.network}
                    </code>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Amazon Proxy
                    </label>
                    <code className="text-xs bg-black/20 px-2 py-1 rounded block">
                      {paymentConfig.amazonProxyUrl}
                    </code>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Payment Proxy
                    </label>
                    <code className="text-xs bg-black/20 px-2 py-1 rounded block">
                      {paymentConfig.paymentProxyUrl}
                    </code>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      USDC Mint
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-black/20 px-2 py-1 rounded flex-1">
                        {maskSecret(paymentConfig.usdcMint)}
                      </code>
                      {paymentConfig.usdcMint && (
                        <button
                          onClick={() => copyToClipboard(paymentConfig.usdcMint, 'usdc-mint')}
                          className="p-1 hover:bg-white/10 rounded"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Copy Notification */}
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg"
          >
            Copied {copied} to clipboard!
          </motion.div>
        )}
      </div>
    </div>
  )
}