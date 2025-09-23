'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { generateRequestId, type ChatMessage } from '@/lib/chat-types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useServiceWorker } from './ServiceWorkerProvider'

interface StreamingConversationalInterfaceProps {
  onSendMessage: (message: string) => void
  onTodosChanged?: () => void
}

interface StreamEvent {
  type: 'start' | 'iteration' | 'tools' | 'tool_complete' | 'finalizing' | 'complete' | 'error' | 'tool_request'
  message?: string
  response?: string
  run_id?: string
  iterations?: number
  iteration?: number
  maxIterations?: number
  tools?: any[] // Tool request objects
  tool?: string
  toolsExecuted?: string[]
  historyDelta?: ChatMessage[]
  error?: string
  duration?: number
  assistantContent?: any[] // Claude's content including tool use
}

export function StreamingConversationalInterface({
  onSendMessage,
  onTodosChanged
}: StreamingConversationalInterfaceProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([])
  const [streamingStatus, setStreamingStatus] = useState<string>('')
  const [currentIteration, setCurrentIteration] = useState<number>(0)
  const [maxIterations, setMaxIterations] = useState<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasLoadedHistory = useRef(false)
  const { isReady: swReady, status: swStatus } = useServiceWorker()

  // Load conversation from localStorage on mount
  useEffect(() => {
    if (!hasLoadedHistory.current) {
      hasLoadedHistory.current = true
      const savedMessages = localStorage.getItem('chat-messages')
      const savedHistory = localStorage.getItem('chat-history')

      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages)
          setMessages(parsed)
        } catch (e) {
          // If parsing fails, use default welcome message
          setMessages([{
            role: 'assistant',
            content: 'Hi! I can help you manage your todos. Try saying things like "Add a todo to buy groceries" or "Show me my high priority tasks".'
          }])
        }
      } else {
        // No saved messages, use default welcome
        setMessages([{
          role: 'assistant',
          content: 'Hi! I can help you manage your todos. Try saying things like "Add a todo to buy groceries" or "Show me my high priority tasks".'
        }])
      }

      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory)
          setConversationHistory(parsed)
        } catch (e) {
          console.error('Failed to parse saved history:', e)
        }
      }
    }
  }, [])

  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    if (hasLoadedHistory.current && messages.length > 0) {
      localStorage.setItem('chat-messages', JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    if (hasLoadedHistory.current && conversationHistory.length > 0) {
      localStorage.setItem('chat-history', JSON.stringify(conversationHistory))
    }
  }, [conversationHistory])

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Clear conversation handler
  const handleClearConversation = () => {
    setMessages([{
      role: 'assistant',
      content: 'Hi! I can help you manage your todos. Try saying things like "Add a todo to buy groceries" or "Show me my high priority tasks".'
    }])
    setConversationHistory([])
    localStorage.removeItem('chat-messages')
    localStorage.removeItem('chat-history')
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
    if (!input.trim() || isLoading || !swReady) return

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
                    setStreamingStatus(event.message || 'Processing...')
                    break

                  case 'tool_request':
                    // Execute tools via Service Worker MCP
                    setStreamingStatus('Executing tools...')

                    try {
                      // Check if Service Worker is ready
                      if (!swReady || !navigator.serviceWorker?.controller) {
                        console.error('[Chat] Service Worker not ready:', { swReady, swStatus, hasController: !!navigator.serviceWorker?.controller });
                        throw new Error('Todo service is still initializing. Please wait a moment and try again.');
                      }

                      const toolResults = []

                      for (const tool of event.tools || []) {
                        setStreamingStatus(`Executing ${tool.name}...`)

                        // Call MCP via Service Worker
                        // Use absolute URL to ensure proper context
                        const mcpUrl = typeof window !== 'undefined'
                          ? `${window.location.origin}/api/mcp/`
                          : '/api/mcp/'

                        const mcpResponse = await fetch(mcpUrl, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'tools/call',
                            params: {
                              name: tool.name, // Keep the original name, SW handles both formats
                              arguments: tool.input
                            },
                            id: Date.now()
                          })
                        })

                        if (!mcpResponse.ok) {
                          const errorData = await mcpResponse.json().catch(() => ({ error: 'Unknown error' }))
                          console.error('[Chat] MCP request failed:', errorData)

                          if (mcpResponse.status === 503) {
                            throw new Error('Todo service is still initializing. Please wait a moment and try again.');
                          }
                          throw new Error(errorData?.error?.message || 'Failed to execute todo operation.');
                        }

                        const mcpResult = await mcpResponse.json()

                        toolResults.push({
                          tool_use_id: tool.id,
                          content: mcpResult.result || mcpResult.error || 'Tool execution failed'
                        })
                      }

                      // Continue conversation with tool results
                      setStreamingStatus('Processing results...')

                      const continueResponse = await fetch('/api/chat/continue', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          messages: [...conversationHistory, userMsg, {
                            role: 'assistant',
                            content: event.assistantContent
                          }],
                          toolResults
                        })
                      })

                      const continueResult = await continueResponse.json()

                      // Check if Claude needs more tools
                      if (continueResult.needsMoreTools) {
                        // Execute additional tools
                        const moreToolResults = []

                        // Use absolute URL to ensure proper context
                        const mcpUrl = typeof window !== 'undefined'
                          ? `${window.location.origin}/api/mcp/`
                          : '/api/mcp/'

                        for (const tool of continueResult.toolRequests || []) {
                          setStreamingStatus(`Executing ${tool.name}...`)

                          const mcpResponse = await fetch(mcpUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              jsonrpc: '2.0',
                              method: 'tools/call',
                              params: {
                                name: tool.name,
                                arguments: tool.input
                              },
                              id: Date.now()
                            })
                          })

                          if (!mcpResponse.ok) {
                            const errorData = await mcpResponse.json().catch(() => ({ error: 'Unknown error' }))
                            throw new Error(errorData?.error?.message || 'Failed to execute todo operation.');
                          }

                          const mcpResult = await mcpResponse.json()
                          moreToolResults.push({
                            tool_use_id: tool.id,
                            content: mcpResult.result || mcpResult.error || 'Tool execution failed'
                          })
                        }

                        // Continue again with new tool results
                        const finalResponse = await fetch('/api/chat/continue', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            messages: [...conversationHistory, userMsg, {
                              role: 'assistant',
                              content: continueResult.assistantContent
                            }, {
                              role: 'user',
                              content: moreToolResults.map((r: any) => ({
                                type: 'tool_result',
                                tool_use_id: r.tool_use_id,
                                content: r.content
                              }))
                            }],
                            toolResults: [...toolResults, ...moreToolResults]
                          })
                        })

                        const finalResult = await finalResponse.json()

                        // Add final response
                        const assistantMsg: ChatMessage = {
                          role: 'assistant',
                          content: finalResult.response
                        }
                        setMessages(prev => [...prev, assistantMsg])
                        setConversationHistory(prev => [...prev, userMsg, assistantMsg])
                      } else {
                        // Add final response
                        const assistantMsg: ChatMessage = {
                          role: 'assistant',
                          content: continueResult.response
                        }
                        setMessages(prev => [...prev, assistantMsg])
                        setConversationHistory(prev => [...prev, userMsg, assistantMsg])
                      }

                      // Notify parent to refresh todos
                      if (onTodosChanged) {
                        onTodosChanged()
                      }

                      setIsLoading(false)
                      setStreamingStatus('')
                    } catch (error) {
                      console.error('Tool execution error:', error)
                      const errorMessage = error instanceof Error ? error.message : 'Sorry, there was an error executing the requested action.'
                      setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: errorMessage
                      }])
                      setIsLoading(false)
                      setStreamingStatus('')
                    }
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
                      setConversationHistory(prev => [...prev, userMsg, ...(event.historyDelta as any)])
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
    if (!content) return ''
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return ''

    // Handle array content (tool use, tool results, etc.)
    const textParts = content
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('\n')

    return textParts || 'Processing...'
  }

  return (
    <div className="flex flex-col h-full border-t dark:border-gray-700">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div className={`prose prose-sm max-w-none ${
                msg.role === 'user' ? 'prose-invert' : ''
              }`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li>{children}</li>,
                  code: ({ children, ...props }) => {
                    const isInline = !props.className
                    return isInline ? (
                      <code className={`px-1 py-0.5 rounded text-sm font-mono ${
                        msg.role === 'user'
                          ? 'bg-blue-600/20 text-blue-100'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>{children}</code>
                    ) : (
                      <code className={`block p-2 rounded text-sm font-mono overflow-x-auto ${
                        msg.role === 'user'
                          ? 'bg-blue-600/20 text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>{children}</code>
                    )
                  },
                  h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  blockquote: ({ children }) => (
                    <blockquote className={`border-l-4 pl-4 italic my-2 ${
                      msg.role === 'user' ? 'border-blue-300' : 'border-gray-300 dark:border-gray-600'
                    }`}>{children}</blockquote>
                  ),
                  hr: () => <hr className={`my-4 ${
                    msg.role === 'user' ? 'border-blue-300' : 'border-gray-300'
                  }`} />,
                }}
              >
                {formatMessageContent(msg.content)}
              </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-3">
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

      <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
        {!swReady && swStatus !== 'error' && (
          <div className="text-sm text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
            <div className="animate-spin h-3 w-3 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full" />
            Initializing todo service...
          </div>
        )}
        {swStatus === 'error' && (
          <div className="text-sm text-red-600 dark:text-red-400 mb-2">
            Todo service unavailable. Please refresh the page.
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={swReady ? "Tell me what you want to do..." : "Waiting for service to initialize..."}
            className="flex-1"
            disabled={isLoading || !swReady}
          />
          <Button type="submit" disabled={isLoading || !swReady}>
            {isLoading ? 'Processing...' : !swReady ? 'Initializing...' : 'Send'}
          </Button>
        </div>
        <div className="flex justify-between items-center mt-2">
          {conversationHistory.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Context: {Math.floor(conversationHistory.length / 2)} messages
            </div>
          )}
          {messages.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const confirmClear = window.confirm('Clear conversation history? This cannot be undone.')
                if (confirmClear) {
                  handleClearConversation()
                }
              }}
              className="text-xs"
            >
              Clear Chat
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}