'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ConversationalInterfaceProps {
  onSendMessage: (message: string) => void
}

export function ConversationalInterface({ onSendMessage }: ConversationalInterfaceProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([
    { role: 'assistant', content: 'Hi! I can help you manage your todos. Try saying things like "Add a todo to buy groceries" or "Show me my high priority tasks".' }
  ])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setMessages(prev => [...prev, { role: 'user', content: input }])

    // TODO: Send to LLM via MCP
    onSendMessage(input)

    // Temporary response
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'I understand you want to: "' + input + '". The conversational interface will be connected to Claude via MCP in the next phase.'
    }])

    setInput('')
  }

  return (
    <div className="flex flex-col h-full border-t">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell me what you want to do..."
            className="flex-1"
          />
          <Button type="submit">Send</Button>
        </div>
      </form>
    </div>
  )
}