// Tool definitions for Claude function calling
export const MALLORY_TOOLS = [
  {
    name: "check_wallet_balance",
    description: "Check the current balance of Mallory's wallet to see available USDC and SOL",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "search_amazon_products",
    description: "Search for products on Amazon by name or category. Returns available SKUs with prices.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Product search query (e.g., 'wireless earbuds', 'bluetooth headphones')"
        },
        max_price: {
          type: "number",
          description: "Maximum price in USD (optional)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_product_details",
    description: "Get detailed information about a specific Amazon product by SKU",
    input_schema: {
      type: "object",
      properties: {
        sku: {
          type: "string",
          description: "Amazon product SKU (e.g., 'B00EXAMPLE')"
        }
      },
      required: ["sku"]
    }
  },
  {
    name: "purchase_amazon_product",
    description: "Purchase a product from Amazon using USDC payment. This will automatically handle the x402 payment flow.",
    input_schema: {
      type: "object",
      properties: {
        sku: {
          type: "string",
          description: "Amazon product SKU to purchase"
        },
        quantity: {
          type: "number",
          description: "Quantity to purchase (default: 1)",
          default: 1
        },
        confirm: {
          type: "boolean",
          description: "Set to true to confirm the purchase after user approval",
          default: false
        },
        shipping: {
          type: "object",
          description: "Shipping address information collected from collect_shipping_address tool",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            address: {
              type: "object",
              properties: {
                line1: { type: "string" },
                line2: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                postalCode: { type: "string" },
                country: { type: "string" }
              }
            }
          }
        }
      },
      required: ["sku"]
    }
  },
  {
    name: "collect_shipping_address",
    description: "Collect shipping address information from the user for order delivery",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Full name for delivery"
        },
        email: {
          type: "string",
          description: "Email address for order updates"
        },
        address_line_1: {
          type: "string",
          description: "Street address (e.g., '123 Main Street')"
        },
        address_line_2: {
          type: "string",
          description: "Apartment, suite, etc. (optional)"
        },
        city: {
          type: "string",
          description: "City name"
        },
        state: {
          type: "string",
          description: "State or province (e.g., 'CA', 'California')"
        },
        postal_code: {
          type: "string",
          description: "ZIP or postal code"
        },
        country: {
          type: "string",
          description: "Country (e.g., 'US', 'United States')",
          default: "US"
        }
      },
      required: ["name", "email", "address_line_1", "city", "state", "postal_code"]
    }
  },
  {
    name: "fund_wallet",
    description: "Add demo USDC or SOL to Mallory's wallet for testing purposes",
    input_schema: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description: "Amount to add to wallet"
        },
        currency: {
          type: "string",
          enum: ["USDC", "SOL"],
          description: "Currency to add (USDC or SOL)"
        }
      },
      required: ["amount", "currency"]
    }
  }
] as const

export type ToolName = typeof MALLORY_TOOLS[number]['name']

// Tool execution results
export interface ToolResult {
  success: boolean
  data?: any
  error?: string
  message?: string
}

// System prompts for Mallory
export const MALLORY_SYSTEM_PROMPT = `You are Mallory, an AI shopping assistant that can actually purchase items on Amazon using USDC cryptocurrency payments.

## Your Capabilities:
- Check wallet balance (USDC/SOL)
- Search Amazon for products
- Get product details and pricing
- Collect shipping address information
- Purchase items with automatic USDC payment
- Fund wallet with demo tokens for testing

## Your Personality:
- Helpful and proactive shopping assistant
- Always check wallet balance before purchases
- Collect shipping info before ordering
- Explain the payment process clearly
- Confirm purchases with users before executing
- Provide order tracking and details

## Purchase Flow:
1. When user asks for something, search for relevant products
2. Show options with prices and details
3. Check wallet balance to ensure sufficient USDC
4. Collect shipping address if not already provided
5. Ask for confirmation before purchasing
6. Execute purchase using x402 payment protocol
7. Provide order confirmation and tracking

## Shipping Address Collection:
- ALWAYS ask for shipping information before making any purchase
- Use the collect_shipping_address tool to gather: name, email, address, city, state, ZIP
- Be friendly: "Where would you like me to ship this?"
- Save shipping info for future orders in the conversation
- Confirm shipping details before finalizing orders

## Important Notes:
- Always check wallet balance before suggesting purchases
- Clearly explain that payments are in USDC on Solana
- Mention that this is a demo environment for testing
- Be transparent about the x402 payment protocol
- Only purchase after explicit user confirmation

Remember: You can actually take actions and complete purchases autonomously once the user confirms. This isn't just a chatbot - you're a functional AI agent with a real wallet and payment capabilities!`