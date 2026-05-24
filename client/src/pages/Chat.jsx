import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import api from '../lib/axios'

const SOCKET = 'http://localhost:3001'

export default function Chat({ user, onLogout }) {
  const [conversations, setConversations] = useState([])
  const [activeConv,    setActiveConv]    = useState(null)
  const [messages,      setMessages]      = useState([])
  const [input,         setInput]         = useState('')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [onlineUsers,   setOnlineUsers]   = useState(new Set())
  const [unreadCounts,  setUnreadCounts]  = useState({})
  const [isTyping,      setIsTyping]      = useState(false)

  const socketRef     = useRef(null)
  const bottomRef     = useRef(null)
  const activeConvRef = useRef(null)

  useEffect(() => {
    activeConvRef.current = activeConv
  }, [activeConv])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    socketRef.current = io(SOCKET, { auth: { token } })

    socketRef.current.on('connect', () => console.log('[socket] connected'))

    socketRef.current.on('online_users', ({ userIds }) => {
      setOnlineUsers(new Set(userIds))
    })

    socketRef.current.on('user_typing', ({ isTyping }) => {
      setIsTyping(isTyping)
      if (isTyping) setTimeout(() => setIsTyping(false), 3000)
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
      const isActive = activeConvRef.current?.conversation_id === msg.conversationId
      setMessages(prev => isActive ? [...prev, msg] : prev)
      setConversations(prev => prev.map(c =>
        c.conversation_id === msg.conversationId
          ? { ...c, last_message: msg.content, last_message_at: msg.created_at }
          : c
      ))
      if (!isActive && msg.senderId !== user.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.conversationId]: (prev[msg.conversationId] || 0) + 1
        }))
      }
    })

    return () => socketRef.current.disconnect()
  }, [])

  useEffect(() => { loadConversations() }, [])

  const loadConversations = async () => {
    try {
      const res = await api.get('/messages/')
      setConversations(res.data.conversations)
    } catch { console.error('failed to load conversations') }
  }

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    try {
      const res = await api.get(`/messages/search/users?q=${q.trim()}`)
      setSearchResults(res.data.users)
    } catch { setSearchResults([]) }
  }

  const startNewConversation = async (selectedUser) => {
    setSearchQuery('')
    setSearchResults([])
    try {
      const res = await api.post('/messages/conversation', { otherUserId: selectedUser.id })
      const conv = {
        conversation_id: res.data.conversation.id,
        other_user_id:   selectedUser.id,
        other_username:  selectedUser.username,
        last_message:    null,
        last_message_at: null,
      }
      setConversations(prev => {
        const exists = prev.find(c => c.conversation_id === conv.conversation_id)
        return exists ? prev : [conv, ...prev]
      })
      openConversation(conv)
    } catch { console.error('failed to start conversation') }
  }

  const openConversation = async (conv) => {
    setActiveConv(conv)
    setUnreadCounts(prev => ({ ...prev, [conv.conversation_id]: 0 }))
    try {
      const res = await api.get(`/messages/${conv.conversation_id}`)
      setMessages(res.data.messages)
    } catch { console.error('failed to load messages') }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = () => {
    if (!input.trim() || !activeConv) return
    socketRef.current.emit('send_message', {
      conversationId: activeConv.conversation_id,
      content:        input,
      recipientId:    activeConv.other_user_id,
    })
    setInput('')
  }

  const handleLogout = () => { localStorage.clear(); onLogout() }

  const formatTime = (ts) => {
    if (!ts) return ''
    const diffMins = Math.floor((Date.now() - new Date(ts)) / 60000)
    if (diffMins < 1)  return 'now'
    if (diffMins < 60) return `${diffMins}m`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24)  return `${diffHrs}h`
    return `${Math.floor(diffHrs / 24)}d`
  }

  const unreadBadge = (convId) => {
    const count = unreadCounts[convId]
    if (!count) return null
    return (
      <span className="bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
        {count < 10 ? count : '9+'}
      </span>
    )
  }

  return (
    // ← CHANGE 1: softer background + rounded container
    <div className="h-screen flex items-center justify-center bg-[#f5f3ff] p-4">
      <div className="w-full h-full flex flex-col rounded-3xl overflow-hidden shadow-xl border border-purple-100">

        {/* Top bar */}
        <div className="bg-white px-6 py-3 flex justify-between items-center shrink-0 border-b border-purple-100">
          <h1 className="text-xl font-bold text-purple-600">GapShap 💬</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">Hi, {user.username}</span>
            <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Logout</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          {/* ← CHANGE 2: softer border */}
          <div className="w-80 bg-white border-r border-purple-100 flex flex-col shrink-0">

            <div className="p-4 border-b border-purple-100 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Messages</p>
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-purple-100 rounded-lg shadow-lg mt-1 z-10">
                    {searchResults.map(u => (
                      <div key={u.id} onClick={() => startNewConversation(u)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs shrink-0">
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
    <div className="flex flex-col items-center justify-center mt-20 px-6 text-center">
      <p className="text-gray-500 font-medium">
        Start a conversation 👋
      </p>
      <p className="text-gray-400 text-sm mt-2">
        Search for a user to begin chatting
      </p>
    </div>
  )}

              {conversations.map(conv => (
                <div key={conv.conversation_id} onClick={() => openConversation(conv)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 border-b border-purple-50
                    ${activeConv?.conversation_id === conv.conversation_id
                      ? 'bg-purple-50 border-l-4 border-l-purple-500'
                      : 'hover:bg-purple-50'}`}>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                      {conv.other_username[0].toUpperCase()}
                    </div>
                    {onlineUsers.has(conv.other_user_id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">{conv.other_username}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {unreadBadge(conv.conversation_id)}
                        <span className="text-xs text-gray-400">{formatTime(conv.last_message_at)}</span>
                      </div>
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

          {/* Chat window */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#f5f3ff]">
            {!activeConv ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-8 max-w-sm">
                  <div className="text-7xl mb-6">💬</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Welcome to GapShap</h2>
                  <p className="text-gray-500 mb-6 leading-relaxed">Start a conversation and chat in real-time.</p>
                  <div className="bg-white rounded-xl shadow-sm border border-purple-100 p-4 text-left space-y-3">
                    {[
                      { icon: '🔍', text: 'Search for a user from the sidebar' },
                      { icon: '👋', text: 'Click on a conversation to open it' },
                      { icon: '⚡', text: 'Messages delivered in real-time' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="text-xl">{item.icon}</span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="bg-white border-b border-purple-100 px-6 py-3 flex items-center gap-3 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                    {activeConv.other_username[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-gray-800">{activeConv.other_username}</span>
                  {onlineUsers.has(activeConv.other_user_id) && (
                    <span className="text-xs text-green-500 font-medium">● online</span>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                  {messages.length === 0 && (
                    <p className="text-center text-gray-400 text-sm mt-10">No messages yet. Say hi!</p>
                  )}

                  {messages.map((msg, i) => {
  const isMe = (msg.sender_id || msg.senderId) === user.id

  // ─── Date separator logic ─────────────────────────
  const msgDate = msg.created_at ? new Date(msg.created_at) : null
  const prevMsg = messages[i - 1]
  const prevDate = prevMsg?.created_at ? new Date(prevMsg.created_at) : null

  const showDateSeparator = msgDate && (
    !prevDate ||
    msgDate.toDateString() !== prevDate.toDateString()
  )

  const formatSeparatorDate = (date) => {
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div key={i}>
      {showDateSeparator && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-purple-100" />
          <span className="text-xs text-gray-400 font-medium px-2">
            {formatSeparatorDate(msgDate)}
          </span>
          <div className="flex-1 h-px bg-purple-100" />
        </div>
      )}
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>

                        {/* ← CHANGE 4: rounder bubbles */}
                        <div className={`px-4 py-2 rounded-3xl max-w-xs text-sm
                          ${isMe ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-800 shadow-sm'}`}>
                          {msg.content}
                          <div className={`text-xs mt-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
    </div>
  )
})}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-500 text-xs px-4 py-2 rounded-2xl shadow-sm italic">
                        {activeConv.other_username} is typing...
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* ← CHANGE 5: floating input */}
                <div className="px-4 py-4 bg-[#f5f3ff]">
                  <div className="bg-white rounded-2xl shadow-lg border border-purple-100 flex gap-2 px-4 py-3">
                    <textarea
                      value={input}
                      rows={1}
                      onChange={e => {
                        setInput(e.target.value)
                        socketRef.current.emit('typing_start', { recipientId: activeConv.other_user_id })
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                          socketRef.current.emit('typing_stop', { recipientId: activeConv.other_user_id })
                        }
                      }}
                      onBlur={() => socketRef.current.emit('typing_stop', { recipientId: activeConv.other_user_id })}
                      placeholder="Type a message..."
                      className="flex-1 focus:outline-none text-sm resize-none bg-transparent"
                    />
                    <button
                      onClick={sendMessage}
                      className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-all duration-200 text-sm font-medium"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}