import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import api from '../lib/axios'

const SOCKET = 'http://localhost:3001'

export default function Chat({ user, onLogout }) {
  const [conversations,  setConversations]  = useState([])
const [activeConv,     setActiveConv]     = useState(null)
const [messages,       setMessages]       = useState([])
const [input,          setInput]          = useState('')
const [searchQuery,    setSearchQuery]    = useState('')
const [searchResults,  setSearchResults]  = useState([])
const [onlineUsers,    setOnlineUsers]    = useState(new Set())
  const socketRef = useRef(null)
  const bottomRef = useRef(null)

  // ─── Connect socket once ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    socketRef.current = io(SOCKET, { auth: { token } })

    socketRef.current.on('connect', () => {
      console.log('[socket] connected')
    })

    // Track online/offline status
socketRef.current.on('online_users', ({ userIds }) => {
  setOnlineUsers(new Set(userIds))
})

socketRef.current.on('user_status', ({ userId, status }) => {
  setOnlineUsers(prev => {
    const next = new Set(prev)
    if (status === 'online') next.add(userId)
    else next.delete(userId)
    return next
  })
})

    socketRef.current.on('new_message', (msg) => {
      // Add to messages if it belongs to active conversation
      setMessages(prev => {
        if (activeConvRef.current?.conversation_id === msg.conversationId) {
          return [...prev, msg]
        }
        return prev
      })
      // Update last message preview in sidebar
      setConversations(prev => prev.map(c =>
        c.conversation_id === msg.conversationId
          ? { ...c, last_message: msg.content, last_message_at: msg.created_at }
          : c
      ))
    })

    return () => socketRef.current.disconnect()
  }, [])

  // ─── Keep a ref to activeConv for use inside socket callback ──
  const activeConvRef = useRef(null)
  useEffect(() => {
    activeConvRef.current = activeConv
  }, [activeConv])

  // ─── Load conversations on mount ─────────────────────
  useEffect(() => {
    loadConversations()
  }, [])

  // ─── Search users ─────────────────────────────────────────
const handleSearch = async (q) => {
  setSearchQuery(q)
  if (q.trim().length < 2) {
    setSearchResults([])
    return
  }
  try {
    const res = await api.get(`/messages/search/users?q=${q.trim()}`)
    setSearchResults(res.data.users)
  } catch {
    setSearchResults([])
  }
}

// ─── Start new conversation from search ───────────────────
const startNewConversation = async (selectedUser) => {
  setSearchQuery('')
  setSearchResults([])
  try {
    const res = await api.post('/messages/conversation', {
      otherUserId: selectedUser.id
    })
    const conv = {
      conversation_id:  res.data.conversation.id,
      other_user_id:    selectedUser.id,
      other_username:   selectedUser.username,
      last_message:     null,
      last_message_at:  null,
    }
    // Add to sidebar if not already there
    setConversations(prev => {
      const exists = prev.find(c => c.conversation_id === conv.conversation_id)
      return exists ? prev : [conv, ...prev]
    })
    openConversation(conv)
  } catch {
    console.error('failed to start conversation')
  }
}

  const loadConversations = async () => {
    try {
      const res = await api.get('/messages/')
      setConversations(res.data.conversations)
    } catch {
      console.error('failed to load conversations')
    }
  }

  // ─── Open a conversation ──────────────────────────────
  const openConversation = async (conv) => {
    setActiveConv(conv)
    try {
      const res = await api.get(`/messages/${conv.conversation_id}`)
      setMessages(res.data.messages)
    } catch {
      console.error('failed to load messages')
    }
  }

  // ─── Auto scroll ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Send message ─────────────────────────────────────
  const sendMessage = () => {
    if (!input.trim() || !activeConv) return

    socketRef.current.emit('send_message', {
      conversationId: activeConv.conversation_id,
      content:        input,
      recipientId:    activeConv.other_user_id,
    })
    setInput('')
  }

  const handleLogout = () => {
    localStorage.clear()
    onLogout()
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1)  return 'now'
    if (diffMins < 60) return `${diffMins}m`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24)  return `${diffHrs}h`
    return `${Math.floor(diffHrs / 24)}d`
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">

      {/* ── Top bar ───────────────────────────────────── */}
      <div className="bg-white shadow px-6 py-3 flex justify-between items-center shrink-0">
        <h1 className="text-xl font-bold text-purple-600">GapShap 💬</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">Hi, {user.username}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">
            Logout
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────── */}
        <div className="w-80 bg-white border-r flex flex-col shrink-0">

          <div className="p-4 border-b space-y-3">
  <p className="text-sm font-semibold text-gray-700">Messages</p>

  {/* Search box */}
  <div className="relative">
    <input
      value={searchQuery}
      onChange={e => handleSearch(e.target.value)}
      placeholder="Search users..."
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
    />

    {/* Search results dropdown */}
    {searchResults.length > 0 && (
      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10">
        {searchResults.map(u => (
          <div
            key={u.id}
            onClick={() => startNewConversation(u)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">
              {u.username[0].toUpperCase()}
            </div>
            <span className="text-sm text-gray-800">{u.username}</span>
          </div>
        ))}
      </div>
    )}
  </div>
</div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <p className="text-center text-gray-400 text-sm mt-8">No conversations yet</p>
            )}
            {conversations.map(conv => (
              <div
                key={conv.conversation_id}
                onClick={() => openConversation(conv)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b
                  ${activeConv?.conversation_id === conv.conversation_id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''}`}
              >
                {/* Avatar with online indicator */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm">
                    {conv.other_username[0].toUpperCase()}
                  </div>
                  {onlineUsers.has(conv.other_user_id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                  )}
                </div>

                {/* Name + preview */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-800">
                      {conv.other_username}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {conv.last_message
                      ? (conv.last_sender_id === user.id ? 'You: ' : '') + conv.last_message
                      : 'No messages yet'}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ── Chat window ───────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="bg-white border-b px-6 py-3 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm">
                  {activeConv.other_username[0].toUpperCase()}
                </div>
                <span className="font-semibold text-gray-800">{activeConv.other_username}</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {messages.length === 0 && (
                  <p className="text-center text-gray-400 text-sm mt-10">
                    No messages yet. Say hi!
                  </p>
                )}
                {messages.map((msg, i) => {
                  const isMe = (msg.sender_id || msg.senderId) === user.id
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-4 py-2 rounded-2xl max-w-xs text-sm
                        ${isMe ? 'bg-purple-600 text-white' : 'bg-white text-gray-800 shadow'}`}>
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t px-6 py-4 flex gap-2 shrink-0">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  onClick={sendMessage}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Send
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}