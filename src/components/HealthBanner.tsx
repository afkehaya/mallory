'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  ExternalLink
} from 'lucide-react'
import { healthEndpoints, validatePaymentSetup } from '@/config/payments'

interface ServiceHealth {
  name: string
  healthy: boolean
  error?: string
}

export default function HealthBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [services, setServices] = useState<ServiceHealth[]>([])
  const [configValid, setConfigValid] = useState(true)
  const [configErrors, setConfigErrors] = useState<string[]>([])
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkSystemHealth()

    // Check health every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000)

    return () => clearInterval(interval)
  }, [])

  const checkSystemHealth = async () => {
    setIsChecking(true)

    // Check configuration
    try {
      const configStatus = validatePaymentSetup()
      setConfigValid(configStatus.valid)
      setConfigErrors(configStatus.errors)
    } catch (error) {
      setConfigValid(false)
      setConfigErrors([error instanceof Error ? error.message : 'Configuration error'])
    }

    // Check services
    const serviceChecks = [
      { name: 'Facilitator', url: healthEndpoints.facilitator },
      { name: 'Amazon Proxy', url: healthEndpoints.amazonProxy },
      { name: 'Payment Proxy', url: healthEndpoints.paymentProxy },
    ]

    const results: ServiceHealth[] = []

    for (const service of serviceChecks) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(service.url, {
          signal: controller.signal,
          cache: 'no-store'
        })

        clearTimeout(timeoutId)

        results.push({
          name: service.name,
          healthy: response.ok,
          error: response.ok ? undefined : `HTTP ${response.status}`
        })
      } catch (error) {
        results.push({
          name: service.name,
          healthy: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        })
      }
    }

    setServices(results)
    setIsChecking(false)

    // Show banner if there are issues and it hasn't been dismissed
    const hasIssues = !configValid || results.some(s => !s.healthy)
    setIsVisible(hasIssues && !isDismissed)
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
  }

  const handleOpenHealth = () => {
    window.open('/health', '_blank')
  }

  if (isChecking && services.length === 0) {
    return null // Don't show anything during initial load
  }

  const healthyCount = services.filter(s => s.healthy).length
  const totalCount = services.length
  const allHealthy = configValid && healthyCount === totalCount

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {isChecking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : allHealthy ? (
                    <CheckCircle className="w-5 h-5 text-green-300" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-300" />
                  )}
                  <span className="font-medium">
                    {isChecking ? (
                      'Checking system health...'
                    ) : allHealthy ? (
                      'All systems operational'
                    ) : (
                      `System issues detected (${healthyCount}/${totalCount} services healthy)`
                    )}
                  </span>
                </div>

                {!allHealthy && !isChecking && (
                  <div className="hidden sm:flex items-center space-x-4 text-sm">
                    {!configValid && (
                      <span className="flex items-center space-x-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Config</span>
                      </span>
                    )}
                    {services.filter(s => !s.healthy).map(service => (
                      <span key={service.name} className="flex items-center space-x-1">
                        <XCircle className="w-4 h-4" />
                        <span>{service.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleOpenHealth}
                  className="px-3 py-1 bg-white/20 rounded-md text-sm font-medium hover:bg-white/30 transition-colors flex items-center space-x-1"
                >
                  <span>View Details</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-white/20 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Error details on mobile */}
            {!allHealthy && !isChecking && (
              <div className="sm:hidden mt-2 text-sm space-y-1">
                {!configValid && (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Configuration issues detected</span>
                  </div>
                )}
                {services.filter(s => !s.healthy).map(service => (
                  <div key={service.name} className="flex items-center space-x-2">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{service.name}: {service.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}