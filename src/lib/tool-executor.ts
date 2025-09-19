import { ToolResult, ToolName } from './tools'

// Internal API base URL
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://your-domain.com/api'
  : 'http://localhost:3000/api'

// Amazon proxy API base URL
const AMAZON_PROXY_URL = process.env.NEXT_PUBLIC_AMAZON_PROXY_URL || 'http://localhost:8787'

// Payment proxy URL for purchases (bypasses our own API to use Faremeter wallet)
const PAYMENT_PROXY_URL = 'http://localhost:8402'

export class ToolExecutor {
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
      // Use Amazon proxy for product search
      const searchUrl = new URL(`${AMAZON_PROXY_URL}/products`)
      searchUrl.searchParams.set('search', query)
      if (maxPrice) {
        searchUrl.searchParams.set('max_price', maxPrice.toString())
      }

      const response = await fetch(searchUrl.toString())

      if (!response.ok) {
        throw new Error(`Amazon search API error: ${response.status}`)
      }

      const data = await response.json()

      // Filter by max price if specified (additional client-side filtering)
      let filteredProducts = data.products || []
      if (maxPrice) {
        filteredProducts = filteredProducts.filter((product: any) => product.price <= maxPrice)
      }

      if (filteredProducts.length === 0) {
        return {
          success: true,
          data: { products: [], query, maxPrice },
          message: `No products found for "${query}"${maxPrice ? ` under $${maxPrice}` : ''}. Try searching for: earbuds, headphones, speaker, charger, or phone stand.`
        }
      }

      return {
        success: true,
        data: {
          products: filteredProducts,
          query,
          maxPrice,
          count: filteredProducts.length
        },
        message: `Found ${filteredProducts.length} product(s) matching "${query}"${maxPrice ? ` under $${maxPrice}` : ''}`
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
      // Use Amazon proxy to get product details - first search for all products, then find the one with matching SKU/ASIN
      const response = await fetch(`${AMAZON_PROXY_URL}/products`)

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
      // Get product details first using Amazon proxy
      const productResult = await this.getProductDetails(sku)
      if (!productResult.success || !productResult.data) {
        return {
          success: false,
          error: `Product with SKU ${sku} not found`
        }
      }
      const product = productResult.data

      const totalPrice = product.price * quantity

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
            unitPrice: product.price,
            totalPrice,
            needsConfirmation: true,
            walletBalance: usdcBalance
          },
          message: `Ready to purchase ${quantity}x ${product.title} for $${totalPrice} USDC. Current wallet balance: $${usdcBalance} USDC. Call this function again with confirm=true to proceed with the purchase.`
        }
      }

      // Execute the actual purchase via payment proxy (this routes through Faremeter with the wallet)
      const response = await fetch(`${PAYMENT_PROXY_URL}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sku, quantity, shipping }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle x402 payment flow or other errors
        return {
          success: false,
          error: `Purchase failed: ${result.error || 'Unknown error'}`,
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