import { useState } from 'react'

function App() {
  // These are "state" variables. When they change, React automatically updates the screen.
  const [crowdCount, setCrowdCount] = useState(15);
  const [status, setStatus] = useState('Normal'); 

  return (
    // 'min-h-screen' makes the dashboard take up the full height of your browser
    <div className="min-h-screen bg-gray-900 text-white p-6">
      
      {/* --- HEADER --- */}
      <header className="mb-6 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-blue-400">Crowd Stampede Monitor</h1>
        <p className="text-gray-400">Real-time safety system dashboard</p>
      </header>

      {/* --- MAIN DASHBOARD GRID --- */}
      {/* We use CSS Grid to create a layout with columns (1 col on mobile, 3 on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Video Feed (Takes up 2 columns) */}
        <div className="md:col-span-2 bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Live Camera Feed</h2>
          
          {/* This is a placeholder box where our actual AI video feed will go later */}
          <div className="aspect-video bg-black flex flex-col items-center justify-center rounded-lg border border-gray-600">
            <span className="text-gray-500 font-medium mb-2">Camera Signal Active</span>
            <div className="text-sm text-gray-400">Waiting for YOLO backend stream...</div>
          </div>
        </div>

        {/* Right Side: Stats and Controls (Takes up 1 column) */}
        <div className="space-y-6">
          
          {/* Stats Card */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Current Status</h2>
            
            <div className="mb-4">
              <p className="text-gray-400 text-sm uppercase tracking-wide">Estimated Crowd</p>
              <p className="text-4xl font-bold">{crowdCount} people</p>
            </div>

            <div>
              <p className="text-gray-400 text-sm uppercase tracking-wide">Threat Level</p>
              {/* We use a ternary operator (?) to make the text green if Normal, red if Danger */}
              <p className={`text-3xl font-bold ${status === 'Normal' ? 'text-green-500' : 'text-red-500'}`}>
                {status}
              </p>
            </div>
          </div>

          {/* Simulation Controls Card */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-2">Test UI</h2>
            <p className="text-sm text-gray-400 mb-4">Click below to test how the dashboard reacts.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setCrowdCount(5);
                  setStatus('Normal');
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 transition-colors py-2 rounded-lg font-medium"
              >
                Safe
              </button>
              
              <button 
                onClick={() => {
                  setCrowdCount(150);
                  setStatus('Danger');
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 transition-colors py-2 rounded-lg font-medium"
              >
                Stampede
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default App
