import { useState } from 'react'
import Login  from './pages/Login'
import Signup from './pages/Signup'
import Chat   from './pages/Chat'

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const [page, setPage] = useState('login')

  if (user) {
    return <Chat user={user} onLogout={() => setUser(null)} />
  }

  if (page === 'signup') {
    return <Signup onSignup={setUser} />
  }

  return <Login onLogin={setUser} onGoSignup={() => setPage('signup')} />
}

export default App