import { useState } from 'react'
import Login from './pages/Login'
import Chat  from './pages/Chat'

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return <Chat user={user} onLogout={() => setUser(null)} />
}

export default App