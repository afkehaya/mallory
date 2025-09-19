import Anthropic from '@anthropic-ai/sdk'
import { MALLORY_TOOLS, MALLORY_SYSTEM_PROMPT } from './tools'
import { ToolExecutor } from './tool-executor'

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
      system: MALLORY_SYSTEM_PROMPT,
      messages: messages,
      tools: MALLORY_TOOLS,
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
            system: MALLORY_SYSTEM_PROMPT,
            messages: messages,
            tools: MALLORY_TOOLS,
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

// New function to handle tool calls and create complete autonomous responses
export async function createAutonomousChatStream(messages: Anthropic.Messages.MessageParam[]) {
  const toolExecutor = new ToolExecutor()
  let conversationMessages = [...messages]

  try {
    while (true) {
      // Use system parameter instead of system message
      const response = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 4000,
        system: MALLORY_SYSTEM_PROMPT,
        messages: conversationMessages,
        tools: MALLORY_TOOLS,
        stream: false,
      })

      // Check if Claude wants to use tools - handle multiple tools in one response
      const toolUses = response.content.filter(block => block.type === 'tool_use')

      if (toolUses.length > 0) {
        console.log('[Anthropic] Claude requested tool use:', toolUses.map(t => ({ name: t.name, input: t.input })))

        // Add Claude's response to conversation
        conversationMessages.push({
          role: 'assistant',
          content: response.content
        })

        // Execute all tools and collect results
        const toolResults = []
        for (const toolUse of toolUses) {
          const toolResult = await toolExecutor.executeToolCall(toolUse.name as any, toolUse.input)
          toolResults.push({
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          })
        }

        // Add all tool results in a single user message
        conversationMessages.push({
          role: 'user',
          content: toolResults
        })

        // Continue the conversation with tool results
        continue
      }

      // No more tools needed, return final response as stream
      const finalContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('')

      // Create a simple stream that yields the final response
      return {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta' as const,
            delta: { text: finalContent, type: 'text' as const }
          }
        }
      }
    }
  } catch (error) {
    console.error('[Anthropic] Autonomous chat error:', error)
    throw error
  }
}