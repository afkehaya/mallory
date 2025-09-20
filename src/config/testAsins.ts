// Test ASINs for development and testing
// These are curated known-good ASINs that should work with the Amazon proxy

export interface TestProduct {
  asin: string
  title: string
  category: string
  estimatedPrice: number
  description: string
  eligibleForTesting: boolean
  notes?: string
}

export const TEST_ASINS: TestProduct[] = [
  {
    asin: 'B00EXAMPLE',
    title: 'Demo Product (Hardcoded)',
    category: 'Electronics',
    estimatedPrice: 169.99,
    description: 'Hardcoded demo product for testing the x402 payment flow',
    eligibleForTesting: true,
    notes: 'This is a mock product that should always work in demo environments'
  },
  {
    asin: 'B0B7PBQZQX',
    title: 'Amazon Echo Dot (5th Gen)',
    category: 'Electronics',
    estimatedPrice: 49.99,
    description: 'Smart speaker with Alexa',
    eligibleForTesting: true,
    notes: 'Popular, consistently available product'
  },
  {
    asin: 'B08C1W5N87',
    title: 'Fire TV Stick 4K Max',
    category: 'Electronics',
    estimatedPrice: 54.99,
    description: 'Streaming media player with Wi-Fi 6 support',
    eligibleForTesting: true,
    notes: 'Amazon own-brand product, usually in stock'
  },
  {
    asin: 'B0BXKQ4P5F',
    title: 'AmazonBasics AA Batteries',
    category: 'Household',
    estimatedPrice: 12.99,
    description: 'Alkaline batteries, 8-pack',
    eligibleForTesting: true,
    notes: 'Low-cost item for testing small purchases'
  },
  {
    asin: 'B01MS1PMML',
    title: 'Pencils #2 HB (Pack of 12)',
    category: 'Office Supplies',
    estimatedPrice: 6.99,
    description: 'Standard #2 pencils for writing and testing',
    eligibleForTesting: true,
    notes: 'Very low cost item, good for testing basic functionality'
  },
  {
    asin: 'B07GMLW8K6',
    title: 'AmazonBasics USB-C to USB-A Cable',
    category: 'Electronics',
    estimatedPrice: 8.99,
    description: '6-foot USB-C to USB-A charging cable',
    eligibleForTesting: true,
    notes: 'Common accessory, reliable availability'
  },
  {
    asin: 'B0FQFB8FMG',
    title: 'Apple AirPods Pro 3',
    category: 'Electronics',
    estimatedPrice: 269.00,
    description: 'Apple AirPods Pro 3rd generation with premium features',
    eligibleForTesting: true,
    notes: 'Real Amazon product for testing SERP API integration and high-value purchases'
  }
]

// Categories for filtering test products
export const TEST_CATEGORIES = [
  'Electronics',
  'Household',
  'Office Supplies',
  'Books',
  'Health & Personal Care'
] as const

export type TestCategory = typeof TEST_CATEGORIES[number]

// Helper functions for working with test ASINs
export function getTestProductByAsin(asin: string): TestProduct | undefined {
  return TEST_ASINS.find(product => product.asin === asin)
}

export function getTestProductsByCategory(category: TestCategory): TestProduct[] {
  return TEST_ASINS.filter(product => product.category === category)
}

export function getEligibleTestProducts(): TestProduct[] {
  return TEST_ASINS.filter(product => product.eligibleForTesting)
}

export function getRandomTestProduct(): TestProduct {
  const eligible = getEligibleTestProducts()
  return eligible[Math.floor(Math.random() * eligible.length)]
}

export function isKnownTestAsin(asin: string): boolean {
  return TEST_ASINS.some(product => product.asin === asin)
}

// Validation helper
export function validateProductForTesting(asin: string): {
  valid: boolean
  product?: TestProduct
  warnings: string[]
  recommendations: string[]
} {
  const product = getTestProductByAsin(asin)
  const warnings: string[] = []
  const recommendations: string[] = []

  if (!product) {
    warnings.push('ASIN not found in test product list')
    recommendations.push('Use one of the curated test ASINs for reliable testing')
    return { valid: false, warnings, recommendations }
  }

  if (!product.eligibleForTesting) {
    warnings.push('Product marked as not eligible for testing')
    recommendations.push('Try a different test product')
  }

  if (product.estimatedPrice > 100) {
    warnings.push('High-value item - consider using a lower-cost test product first')
    recommendations.push('Start with items under $50 for initial testing')
  }

  return {
    valid: product.eligibleForTesting,
    product,
    warnings,
    recommendations
  }
}

// Default test search queries that should return good results
export const DEFAULT_TEST_QUERIES = [
  'pencils',
  'batteries',
  'usb cable',
  'echo dot',
  'fire tv stick'
] as const

export type DefaultTestQuery = typeof DEFAULT_TEST_QUERIES[number]