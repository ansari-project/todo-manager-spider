'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { generateRequestId, type ChatMessage } from '@/lib/chat-types'

interface StreamingConversationalInterfaceProps {
  onSendMessage: (message: string) => void
  onTodosChanged?: () => void
}

interface StreamEvent {
  type: 'start' | 'iteration' | 'tools' | 'tool_complete' | 'finalizing' | 'complete' | 'error'
  message?: string
  response?: string
  run_id?: string
  iterations?: number
  iteration?: number
  maxIterations?: number
  tools?: string[]
  tool?: string
  toolsExecuted?: string[]
  historyDelta?: ChatMessage[]
  error?: string
  duration?: number
}

export function StreamingConversationalInterface({
  onSendMessage,
  onTodosChanged
}: StreamingConversationalInterfaceProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I can help you manage your todos. Try saying things like "Add a todo to buy groceries" or "Show me my high priority tasks".'
    }
  ])
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([])
  const [streamingStatus, setStreamingStatus] = useState<string>('')
  const [currentIteration, setCurrentIteration] = useState<number>(0)
  const [maxIterations, setMaxIterations] = useState<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingStatus])

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      setStreamingStatus('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input
    const requestId = generateRequestId()
    setInput('')

    // Add user message to UI immediately
    const userMsg: ChatMessage = { role: 'user', content: userMessage }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setStreamingStatus('Connecting...')
    setCurrentIteration(0)
    setMaxIterations(0)

    // Create abort controller for cancellation
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: conversationHistory,
          requestId,
          maxIterations: 3
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      // Process streaming response
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data.trim()) {
              try {
                const event: StreamEvent = JSON.parse(data)

                switch (event.type) {
                  case 'start':
                    setStreamingStatus(event.message || 'Processing...')
                    break

                  case 'iteration':
                    setCurrentIteration(event.iteration || 0)
                    setMaxIterations(event.maxIterations || 3)
                    setStreamingStatus(event.message || `Step ${event.iteration}`)
                    break

                  case 'tools':
                    setStreamingStatus(
                      `Executing: ${event.tools?.join(', ') || 'tools'}...`
                    )
                    break

                  case 'tool_complete':
                    setStreamingStatus(event.message || `✓ ${event.tool} done`)
                    break

                  case 'finalizing':
                    setStreamingStatus(event.message || 'Preparing response...')
                    break

                  case 'complete':
                    // Add assistant response
                    const assistantMsg: ChatMessage = {
                      role: 'assistant',
                      content: event.response || ''
                    }
                    setMessages(prev => [...prev, assistantMsg])

                    // Update conversation history
                    if (event.historyDelta && event.historyDelta.length > 0) {
                      setConversationHistory(prev => [...prev, userMsg, ...event.historyDelta])
                    } else {
                      setConversationHistory(prev => [...prev, userMsg, assistantMsg])
                    }

                    // Notify parent to refresh todos if needed
                    if (onTodosChanged && event.toolsExecuted?.length) {
                      onTodosChanged()
                    }

                    setIsLoading(false)
                    setStreamingStatus('')
                    break

                  case 'error':
                    const errorMsg: ChatMessage = {
                      role: 'assistant',
                      content: event.error || 'An error occurred.'
                    }
                    setMessages(prev => [...prev, errorMsg])
                    setIsLoading(false)
                    setStreamingStatus('')
                    break
                }
              } catch (err) {
                console.error('Failed to parse SSE data:', err)
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        const cancelMsg: ChatMessage = {
          role: 'assistant',
          content: 'Request cancelled.'
        }
        setMessages(prev => [...prev, cancelMsg])
      } else {
        console.error('Chat error:', error)
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I could not connect to the chat service.'
        }
        setMessages(prev => [...prev, errorMsg])
      }
    } finally {
      setIsLoading(false)
      setStreamingStatus('')
      abortControllerRef.current = null
    }

    // Also call the original callback
    onSendMessage(userMessage)
  }

  // Format message content for display
  const formatMessageContent = (content: ChatMessage['content']): string => {
    if (typeof content === 'string') return content

    // Handle array content (tool use, tool results, etc.)
    const textParts = content
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('\n')

    return textParts || 'Processing...'
  }

  return (
    <div className="flex flex-col h-full border-t">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {formatMessageContent(msg.content)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="animate-pulse">{streamingStatus || 'Thinking...'}</div>
                {currentIteration > 0 && maxIterations > 0 && (
                  <span className="text-xs opacity-50">
                    (step {currentIteration}/{maxIterations})
                  </span>
                )}
              </div>
              {abortControllerRef.current && (
                <Button
                  onClick={handleCancel}
                  size="sm"
                  variant="ghost"
                  className="mt-2 text-xs"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me what you want to do..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Send'}
          </Button>
        </div>
        {conversationHistory.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            Context: {Math.floor(conversationHistory.length / 2)} messages
          </div>
        )}
      </form>
    </div>
  )
}