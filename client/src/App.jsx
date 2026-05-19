import { useState } from 'react'
import Login from './pages/Login'

function App() {
  const [user, setUser] = useState(null)

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-purple-600">
          Welcome, {user.username}! 💬
        </h1>
        <p className="text-gray-500 mt-2">Chat is coming next...</p>
      </div>
    </div>
  )
}

export default App