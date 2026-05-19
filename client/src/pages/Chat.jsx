import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import axios from 'axios'

const API    = 'http://localhost:3001/api'
const SOCKET = 'http://localhost:3001'

export default function Chat({ user, onLogout }) {
  const [messages,       setMessages]       = useState([])
  const [input,          setInput]          = useState('')
  const [recipientId,    setRecipientId]    = useState('')
  const [conversationId, setConversationId] = useState(null)
  const socketRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')

    // Connect socket with JWT
    socketRef.current = io(SOCKET, { auth: { token } })

    socketRef.current.on('connect', () => {
      console.log('[socket] connected')
    })

    // Listen for incoming messages
    socketRef.current.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg])
    })

    return () => socketRef.current.disconnect()
  }, [])

  // Auto scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startConversation = async () => {
    if (!recipientId.trim()) return
    try {
      const token = localStorage.getItem('accessToken')
      const res   = await axios.post(
        `${API}/messages/conversation`,
        { otherUserId: recipientId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setConversationId(res.data.conversation.id)
      setMessages([])
    } catch (err) {
      alert('User not found or invalid ID')
    }
  }

  const sendMessage = () => {
    if (!input.trim() || !conversationId || !recipientId) return

    socketRef.current.emit('send_message', {
      conversationId,
      content:     input,
      recipientId,
    })
    setInput('')
  }

  const handleLogout = () => {
    localStorage.clear()
    onLogout()
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* Header */}
      <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-purple-600">GapShap 💬</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">Hi, {user.username}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Start conversation */}
      <div className="bg-white border-b px-6 py-3 flex gap-2">
        <input
          value={recipientId}
          onChange={e => setRecipientId(e.target.value)}
          placeholder="Paste recipient's user ID..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <button
          onClick={startConversation}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700"
        >
          Start Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 mt-10">
            {conversationId ? 'No messages yet. Say hi!' : 'Enter a user ID above to start chatting'}
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`px-4 py-2 rounded-2xl max-w-xs text-sm
              ${msg.senderId === user.id
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-800 shadow'}`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          disabled={!conversationId}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!conversationId}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>

    </div>
  )
}