import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY

if (!apiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable')
}

// Model resolution with fallbacks
const getClaudeModel = () => {
  const preferred = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514'
  const fallbacks = [
    'claude-3-7-sonnet-20250219',
    'claude-sonnet-4-0',
    'claude-3-7-sonnet-latest',
    'claude-3-5-sonnet-20241022'
  ]

  console.log('Using Claude model:', preferred)
  return preferred
}

export const anthropic = new Anthropic({
  apiKey,
})

export const MODEL_NAME = getClaudeModel()

export async function createChatCompletion(messages: Anthropic.Messages.MessageParam[]) {
  try {
    const response = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 4000,
      messages,
      stream: false,
    })

    return response
  } catch (error: any) {
    console.error('Claude API error:', error)

    // If the model is not found, try fallback models
    if (error?.status === 404 || error?.message?.includes('model')) {
      const fallbacks = [
        'claude-3-7-sonnet-20250219',
        'claude-sonnet-4-0',
        'claude-3-7-sonnet-latest',
        'claude-3-5-sonnet-20241022'
      ]

      for (const fallbackModel of fallbacks) {
        try {
          console.log('Trying fallback model:', fallbackModel)
          const fallbackResponse = await anthropic.messages.create({
            model: fallbackModel,
            max_tokens: 4000,
            messages,
            stream: false,
          })
          return fallbackResponse
        } catch (fallbackError) {
          console.error(`Fallback model ${fallbackModel} failed:`, fallbackError)
          continue
        }
      }
    }

    throw error
  }
}

export async function createChatStream(messages: Anthropic.Messages.MessageParam[]) {
  try {
    const stream = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 4000,
      messages,
      stream: true,
    })

    return stream
  } catch (error: any) {
    console.error('Claude streaming API error:', error)

    // If the model is not found, try fallback models
    if (error?.status === 404 || error?.message?.includes('model')) {
      const fallbacks = [
        'claude-3-7-sonnet-20250219',
        'claude-sonnet-4-0',
        'claude-3-7-sonnet-latest',
        'claude-3-5-sonnet-20241022'
      ]

      for (const fallbackModel of fallbacks) {
        try {
          console.log('Trying fallback streaming model:', fallbackModel)
          const fallbackStream = await anthropic.messages.create({
            model: fallbackModel,
            max_tokens: 4000,
            messages,
            stream: true,
          })
          return fallbackStream
        } catch (fallbackError) {
          console.error(`Fallback streaming model ${fallbackModel} failed:`, fallbackError)
          continue
        }
      }
    }

    throw error
  }
}