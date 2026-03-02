'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { generateSystemPrompt } from '@/lib/chatbot-knowledge'

// Render message content with embedded clickable links (same tab)
function MessageContent({ content, isBot }: { content: string; isBot: boolean }) {
  // Parse markdown links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: (string | { text: string; url: string })[] = []
  let lastIndex = 0
  let match
  
  while ((match = linkRegex.exec(content)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    // Add the link object
    parts.push({ text: match[1], url: match[2] })
    lastIndex = match.index + match[0].length
  }
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }
  
  return (
    <p className="text-sm whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (typeof part === 'string') {
          return <span key={i}>{part}</span>
        }
        // Embedded link - opens in same tab
        return (
          <Link 
            key={i} 
            href={part.url} 
            className={`underline font-medium ${isBot ? 'text-navy hover:text-navy/70' : 'text-lime hover:text-lime/80'}`}
          >
            {part.text}
          </Link>
        )
      })}
    </p>
  )
}

type Message = {
  id: string
  role: 'bot' | 'user'
  content: string
  timestamp: Date
}

// Generate system prompt from centralized knowledge base
const SYSTEM_PROMPT = generateSystemPrompt()

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'bot',
    content: 'Hej! 👋 Velkommen til Autorykker. Jeg er her for at hjælpe dig med spørgsmål om vores platform. Hvad kan jeg hjælpe dig med?',
    timestamp: new Date()
  }
]

const quickReplies = [
  'Hvad er Autorykker?',
  'Hvad koster det?',
  'Hvordan kommer jeg i gang?',
  'Tal med en person'
]

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const startNewChat = () => {
    setMessages(initialMessages)
    setShowQuickReplies(true)
  }

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim()
    if (!text || isTyping) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)
    setShowQuickReplies(false)

    try {
      // Build conversation history for OpenAI
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        content: msg.content
      }))

      // Call OpenAI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          systemPrompt: SYSTEM_PROMPT
        })
      })

      let botContent: string
      if (response.ok) {
        const data = await response.json()
        botContent = data.message || 'Beklager, jeg kunne ikke generere et svar. Prøv igen.'
      } else {
        // Fallback response if API fails
        botContent = 'Beklager, jeg har tekniske problemer lige nu. Du kan kontakte os på support@autorykker.dk eller +45 70 12 34 56.'
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: botContent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
      
      // Show quick replies again after bot responds
      setShowQuickReplies(true)
    } catch {
      // Network error fallback
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: 'Beklager, der opstod en fejl. Du kan kontakte os direkte på support@autorykker.dk eller +45 70 12 34 56.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setShowQuickReplies(true)
    } finally {
      setIsTyping(false)
    }
  }

  const handleQuickReply = (reply: string) => {
    handleSend(reply)
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-gray-600 rotate-90' : 'bg-navy hover:scale-110'
        }`}
        aria-label={isOpen ? 'Luk chat' : 'Åbn chat'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-lime" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ height: '500px', maxHeight: 'calc(100vh - 140px)' }}>
          {/* Header */}
          <div className="bg-navy text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-lime rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-navy" />
              </div>
              <div>
                <h3 className="font-bold">Autorykker Support</h3>
                <p className="text-sm text-gray-300">AI-assistent</p>
              </div>
            </div>
            <button
              onClick={startNewChat}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Start ny chat"
            >
              <RotateCcw className="w-5 h-5 text-gray-300 hover:text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'bot' ? 'bg-navy' : 'bg-gray-300'
                }`}>
                  {message.role === 'bot' ? (
                    <Bot className="w-4 h-4 text-lime" />
                  ) : (
                    <User className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.role === 'bot' 
                    ? 'bg-white border border-gray-200 text-gray-700' 
                    : 'bg-navy text-white'
                }`}>
                  <MessageContent content={message.content} isBot={message.role === 'bot'} />
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-lime" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies - always visible when showQuickReplies is true */}
          {showQuickReplies && !isTyping && (
            <div className="px-4 py-2 bg-white border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className="text-xs bg-navy/10 text-navy px-3 py-1.5 rounded-full hover:bg-navy hover:text-white transition-colors font-medium"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Skriv en besked..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent text-sm"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 bg-navy text-lime rounded-xl flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
