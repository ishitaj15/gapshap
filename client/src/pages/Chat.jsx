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

  const socketRef    = useRef(null)
  const bottomRef    = useRef(null)
  const activeConvRef = useRef(null)

  useEffect(() => {
    activeConvRef.current = activeConv
  }, [activeConv])

  // ─── Connect socket once ──────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    socketRef.current = io(SOCKET, { auth: { token } })

    socketRef.current.on('connect', () => {
      console.log('[socket] connected')
    })

    socketRef.current.on('online_users', ({ userIds }) => {
      setOnlineUsers(new Set(userIds))
    })

    // Typing indicator
socketRef.current.on('user_typing', ({ isTyping }) => {
  setIsTyping(isTyping)
  // Auto clear after 3 seconds in case stop event is missed
  if (isTyping) {
    setTimeout(() => setIsTyping(false), 3000)
  }
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

      setMessages(prev => {
        if (isActive) return [...prev, msg]
        return prev
      })

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

  // ─── Load conversations on mount ─────────────────────
  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const res = await api.get('/messages/')
      setConversations(res.data.conversations)
    } catch {
      console.error('failed to load conversations')
    }
  }

  const handleSearch = async (q) => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    try {
      const res = await api.get(`/messages/search/users?q=${q.trim()}`)
      setSearchResults(res.data.users)
    } catch {
      setSearchResults([])
    }
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
    } catch {
      console.error('failed to start conversation')
    }
  }

  const openConversation = async (conv) => {
    setActiveConv(conv)
    setUnreadCounts(prev => ({ ...prev, [conv.conversation_id]: 0 }))
    try {
      const res = await api.get(`/messages/${conv.conversation_id}`)
      setMessages(res.data.messages)
    } catch {
      console.error('failed to load messages')
    }
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

  const handleLogout = () => {
    localStorage.clear()
    onLogout()
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const diffMins = Math.floor((Date.now() - d) / 60000)
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
    <div className="h-screen flex flex-col bg-gray-100">

      {/* Top bar */}
      <div className="bg-white shadow px-6 py-3 flex justify-between items-center shrink-0">
        <h1 className="text-xl font-bold text-purple-600">GapShap 💬</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">Hi, {user.username}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <div className="w-80 bg-white border-r flex flex-col shrink-0">

          <div className="p-4 border-b space-y-3">
            <p className="text-sm font-semibold text-gray-700">Messages</p>
            <div className="relative">
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10">
                  {searchResults.map(u => (
                    <div key={u.id} onClick={() => startNewConversation(u)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
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
              <div key={conv.conversation_id} onClick={() => openConversation(conv)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b
                  ${activeConv?.conversation_id === conv.conversation_id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''}`}>

                {/* Avatar */}
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
              <div className="bg-white border-b px-6 py-3 flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-sm">
                  {activeConv.other_username[0].toUpperCase()}
                </div>
                <span className="font-semibold text-gray-800">{activeConv.other_username}</span>
                {onlineUsers.has(activeConv.other_user_id) && (
                  <span className="text-xs text-green-500 font-medium">● online</span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
                {messages.length === 0 && (
                  <p className="text-center text-gray-400 text-sm mt-10">No messages yet. Say hi!</p>
                )}
                {messages.map((msg, i) => {
                  const isMe = (msg.sender_id || msg.senderId) === user.id
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                     <div className={`px-4 py-2 rounded-2xl max-w-xs text-sm
                        ${isMe ? 'bg-purple-600 text-white' : 'bg-white text-gray-800 shadow'}`}>
                        {msg.content}
                        <div className={`text-xs mt-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div> 
                    </div>
                  )
                })}
                {isTyping && (
  <div className="flex justify-start">
    <div className="bg-white text-gray-500 text-xs px-4 py-2 rounded-2xl shadow italic">
      {activeConv.other_username} is typing...
    </div>
  </div>
)}

                <div ref={bottomRef} />
              </div>

              <div className="bg-white border-t px-6 py-4 flex gap-2 shrink-0">
                <input
  value={input}
  onChange={e => {
    setInput(e.target.value)
    // Emit typing start
    socketRef.current.emit('typing_start', { recipientId: activeConv.other_user_id })
  }}
  onKeyDown={e => {
    if (e.key === 'Enter') {
      sendMessage()
      // Emit typing stop on send
      socketRef.current.emit('typing_stop', { recipientId: activeConv.other_user_id })
    }
  }}
  onBlur={() => {
    // Emit typing stop when input loses focus
    socketRef.current.emit('typing_stop', { recipientId: activeConv.other_user_id })
  }}
  placeholder="Type a message..."
  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
/>

                <button onClick={sendMessage}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
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