import { ToolResult, ToolName } from './tools'
import { executeX402Flow } from './faremeter'
import { paymentConfig } from '@/config/payments'
import { validateProductForTesting, getTestProductByAsin, isKnownTestAsin } from '@/config/testAsins'

// Internal API base URL
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://your-domain.com/api'
  : 'http://localhost:3001/api'

// Use payment config for consistent URL management
const AMAZON_PROXY_URL = paymentConfig.amazonProxyUrl
const PAYMENT_PROXY_URL = paymentConfig.paymentProxyUrl

export class ToolExecutor {
  // Simple in-memory cache for recently searched products with their signed data
  private productCache = new Map<string, any>()

  // Execute a tool call from Claude
  async executeToolCall(toolName: ToolName, parameters: any): Promise<ToolResult> {
    console.log(`[ToolExecutor] Executing ${toolName} with parameters:`, parameters)

    try {
      switch (toolName) {
        case 'check_wallet_balance':
          return await this.checkWalletBalance()

        case 'search_amazon_products':
          return await this.searchAmazonProducts(parameters.query, parameters.max_price)

        case 'get_product_details':
          return await this.getProductDetails(parameters.sku)

        case 'purchase_amazon_product':
          return await this.purchaseAmazonProduct(parameters.sku, parameters.quantity || 1, parameters.confirm || false, parameters.shipping)

        case 'collect_shipping_address':
          return await this.collectShippingAddress(parameters)

        case 'fund_wallet':
          return await this.fundWallet(parameters.amount, parameters.currency)

        default:
          return {
            success: false,
            error: `Unknown tool: ${toolName}`
          }
      }
    } catch (error) {
      console.error(`[ToolExecutor] Error executing ${toolName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async checkWalletBalance(): Promise<ToolResult> {
    try {
      const response = await fetch(`${API_BASE}/wallet`)

      if (!response.ok) {
        throw new Error(`Wallet API error: ${response.status}`)
      }

      const data = await response.json()

      return {
        success: true,
        data: {
          address: data.address,
          balances: data.balances,
          summary: `Wallet Balance: ${data.balances.USDC} USDC, ${data.balances.SOL} SOL`
        },
        message: `Current wallet balance: ${data.balances.USDC} USDC and ${data.balances.SOL} SOL`
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to check wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async searchAmazonProducts(query: string, maxPrice?: number): Promise<ToolResult> {
    try {
      // Use Amazon proxy for product search with proper parameter handling
      const searchUrl = new URL(`${AMAZON_PROXY_URL}/products`)
      searchUrl.searchParams.set('search', query)
      searchUrl.searchParams.set('limit', '10') // Reasonable limit
      if (maxPrice) {
        searchUrl.searchParams.set('max_price', maxPrice.toString())
      }

      console.log(`[ToolExecutor] Searching products at: ${searchUrl.toString()}`)

      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mallory/1.0',
        },
        cache: 'no-store' // Always get fresh product data
      })

      if (!response.ok) {
        throw new Error(`Amazon search API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[ToolExecutor] Search response:`, data)

      // Handle new signed product format
      let signedProducts = data.products || []

      // Filter by max price if specified (additional client-side filtering)
      if (maxPrice) {
        signedProducts = signedProducts.filter((item: any) => {
          const product = item.product || item
          const price = product.price?.amount || product.price || 0
          return price <= maxPrice
        })
      }

      if (signedProducts.length === 0) {
        return {
          success: true,
          data: { products: [], query, maxPrice },
          message: `No products found for "${query}"${maxPrice ? ` under $${maxPrice}` : ''}. Try searching for: earbuds, headphones, speaker, charger, or phone stand.`
        }
      }

      // Transform to include display data while preserving signed data
      const transformedProducts = signedProducts.map((item: any) => {
        const product = item.product || item

        const transformedProduct = {
          // Display data for UI
          asin: product.asin,
          title: product.title,
          price: product.price?.amount || product.price || 0,
          image: product.image,
          url: product.url,

          // Signed data for stateless flow
          productBlob: item.productBlob,
          signature: item.signature,

          // Keep the full product for compatibility
          ...product
        }

        // Cache this product for later purchase use
        if (product.asin && item.productBlob && item.signature) {
          this.productCache.set(product.asin, transformedProduct)
        }

        return transformedProduct
      })

      return {
        success: true,
        data: {
          products: transformedProducts,
          query,
          maxPrice,
          count: transformedProducts.length
        },
        message: `Found ${transformedProducts.length} product(s) matching "${query}"${maxPrice ? ` under $${maxPrice}` : ''}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Product search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async getProductDetails(sku: string): Promise<ToolResult> {
    try {
      // Use Faremeter/x402 payment proxy to get product details - first search for all products, then find the one with matching SKU/ASIN
      const response = await fetch(`${PAYMENT_PROXY_URL}/products`)

      if (!response.ok) {
        throw new Error(`Amazon API error: ${response.status}`)
      }

      const data = await response.json()
      const product = data.products?.find((p: any) => p.sku === sku || p.asin === sku)

      if (!product) {
        return {
          success: false,
          error: `Product with SKU ${sku} not found. Try searching for products first.`
        }
      }

      return {
        success: true,
        data: product,
        message: `Product details for ${product.title}: $${product.price} - ${product.description}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get product details: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async purchaseAmazonProduct(sku: string, quantity: number, confirm: boolean, shipping?: any): Promise<ToolResult> {
    try {
      // Pre-purchase eligibility validation
      const eligibilityCheck = validateProductForTesting(sku)
      const isTestProduct = isKnownTestAsin(sku)

      // Log eligibility warnings for debugging
      if (eligibilityCheck.warnings.length > 0) {
        console.warn(`[ToolExecutor] Eligibility warnings for ${sku}:`, eligibilityCheck.warnings)
      }

      // Check if we have this product in our cache from recent searches
      let product = this.productCache.get(sku)

      if (!product) {
        console.log(`[ToolExecutor] Product ${sku} not in cache, performing fallback search...`)

        // For test products, try to get known data first
        if (isTestProduct) {
          const testProduct = getTestProductByAsin(sku)
          if (testProduct && !testProduct.eligibleForTesting) {
            return {
              success: false,
              error: `Test product ${sku} (${testProduct.title}) is marked as not eligible for testing. ${eligibilityCheck.recommendations.join(' ')}`
            }
          }
        }

        // Fallback: search for the specific ASIN to get fresh signed data
        const searchResult = await this.searchAmazonProducts(sku, undefined)

        if (!searchResult.success || !searchResult.data || searchResult.data.products.length === 0) {
          // Provide better error messages for test products
          if (isTestProduct) {
            const testProduct = getTestProductByAsin(sku)
            return {
              success: false,
              error: `Test product ${sku} (${testProduct?.title || 'Unknown'}) not found via search. The proxy may not be running or the product may be temporarily unavailable.`
            }
          }

          return {
            success: false,
            error: `Product with ASIN ${sku} not found. The product may no longer be available or the ASIN may be invalid.`
          }
        }

        // Find the exact product by ASIN
        const foundProduct = searchResult.data.products.find((p: any) => p.asin === sku)

        if (!foundProduct) {
          return {
            success: false,
            error: `Product with ASIN ${sku} not found in search results. The ASIN may be invalid.`
          }
        }

        product = foundProduct
        console.log(`[ToolExecutor] Successfully retrieved product ${sku} via fallback search`)
      }

      // Check if we have the required signed data
      if (!product.productBlob || !product.signature) {
        return {
          success: false,
          error: `Missing signed product data for ${sku}. Please search for this product again to get fresh signed data.`
        }
      }

      const unitPrice = product.price
      const totalPrice = unitPrice * quantity

      // Check wallet balance first
      const balanceResult = await this.checkWalletBalance()
      if (!balanceResult.success || !balanceResult.data) {
        return {
          success: false,
          error: 'Could not check wallet balance before purchase'
        }
      }

      const usdcBalance = balanceResult.data.balances.USDC
      if (usdcBalance < totalPrice) {
        return {
          success: false,
          error: `Insufficient USDC balance. Need $${totalPrice} but have $${usdcBalance} USDC. Use fund_wallet tool to add more USDC.`,
          data: {
            required: totalPrice,
            available: usdcBalance,
            shortfall: totalPrice - usdcBalance
          }
        }
      }

      if (!confirm) {
        return {
          success: true,
          data: {
            product,
            quantity,
            unitPrice,
            totalPrice,
            needsConfirmation: true,
            walletBalance: usdcBalance
          },
          message: `Ready to purchase ${quantity}x ${product.title} for $${totalPrice} USDC. Current wallet balance: $${usdcBalance} USDC. Call this function again with confirm=true to proceed with the purchase.`
        }
      }

      // Create wallet address for idempotency key
      const walletAddress = balanceResult.data.address || 'unknown-wallet'
      const idempotencyKey = `${walletAddress}-${product.asin}-${Date.now()}`

      // Execute the actual purchase via improved x402 payment protocol
      const response = await executeX402Flow(`${PAYMENT_PROXY_URL}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mallory/1.0',
        },
        body: {
          asin: product.asin,
          productBlob: product.productBlob,
          signature: product.signature,
          quantity,
          shipping,
          idempotencyKey,
          priceExpectation: {
            amount: unitPrice,
            currency: 'USD'
          },
          walletAddress: balanceResult.data.address
        },
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle x402 payment flow or other errors
        return {
          success: false,
          error: `Purchase failed: ${result.message || result.error || 'Unknown error'}`,
          data: result
        }
      }

      return {
        success: true,
        data: {
          ...result,
          product,
          quantity,
          totalPrice
        },
        message: `🎉 Purchase successful! Ordered ${quantity}x ${product.title} for $${totalPrice} USDC. ${result.orderId ? `Order ID: ${result.orderId}` : ''}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async collectShippingAddress(addressData: any): Promise<ToolResult> {
    try {
      // Validate required fields
      const required = ['name', 'email', 'address_line_1', 'city', 'state', 'postal_code']
      const missing = required.filter(field => !addressData[field])

      if (missing.length > 0) {
        return {
          success: false,
          error: `Missing required shipping information: ${missing.join(', ')}`
        }
      }

      // Format address for display
      const formattedAddress = {
        name: addressData.name,
        email: addressData.email,
        address: {
          line1: addressData.address_line_1,
          line2: addressData.address_line_2 || '',
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postal_code,
          country: addressData.country || 'US'
        }
      }

      return {
        success: true,
        data: formattedAddress,
        message: `Shipping address collected for ${formattedAddress.name}:\n${formattedAddress.address.line1}${formattedAddress.address.line2 ? ', ' + formattedAddress.address.line2 : ''}\n${formattedAddress.address.city}, ${formattedAddress.address.state} ${formattedAddress.address.postalCode}\n${formattedAddress.address.country}\n\nEmail: ${formattedAddress.email}\n\nThis address will be used for your order delivery.`
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to collect shipping address: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async fundWallet(amount: number, currency: 'USDC' | 'SOL'): Promise<ToolResult> {
    try {
      const response = await fetch(`${API_BASE}/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'fund',
          amount,
          currency,
        }),
      })

      if (!response.ok) {
        throw new Error(`Wallet funding failed: ${response.status}`)
      }

      const result = await response.json()

      return {
        success: true,
        data: result,
        message: `Successfully added ${amount} ${currency} to wallet. New balance: ${result.balances.USDC} USDC, ${result.balances.SOL} SOL`
      }
    } catch (error) {
      return {
        success: false,
        error: `Wallet funding failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}