import { NextRequest, NextResponse } from 'next/server'
import { createChatStream } from '@/lib/anthropic'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((message: any) => ({
      role: message.role === 'user' ? 'user' as const : 'assistant' as const,
      content: message.content,
    }))

    // Create streaming response
    const stream = await createChatStream(anthropicMessages)

    // Create a ReadableStream to handle the response
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta') {
              const delta = chunk.delta
              if ('text' in delta && delta.text) {
                const data = `data: ${JSON.stringify({ content: delta.text })}\n\n`
                controller.enqueue(new TextEncoder().encode(data))
              }
            }
          }

          // Send final message
          const finalData = `data: ${JSON.stringify({ done: true })}\n\n`
          controller.enqueue(new TextEncoder().encode(finalData))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}