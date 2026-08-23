import { useState, useEffect } from 'react'

function App() {
  const [crowdCount, setCrowdCount] = useState(0);
  const [status, setStatus] = useState('Connecting...'); 
  const [imageFrame, setImageFrame] = useState(null); // This captures the video picture!

  // useEffect runs automatically when the dashboard loads. 
  // It handles connecting to our Python backend in the background.
  useEffect(() => {
    // Connect to the FastAPI WebSocket backend (Make sure your FastAPI server is running!)
    const ws = new WebSocket('ws://localhost:8000/ws/stream');

    ws.onopen = () => {
      console.log('Connected to Python Backend!');
      setStatus('NORMAL'); // Default starting status once connected
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update our screen with the real YOLOv8 numbers!
      setCrowdCount(data.person_count);
      setStatus(data.status);
      setImageFrame(data.frame); 
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setStatus('Disconnected');
    };

    ws.onclose = () => {
      console.log('Disconnected from Backend');
      setStatus('Disconnected');
    };

    // Cleanup: if the user closes the dashboard, cleanly shut down the connection
    return () => {
      ws.close();
    };
  }, []); // The empty brackets [] mean this connection logic only runs once

  // --- NEW: Determine dynamic styling based on the threat level sent by Python ---
  const isCritical = status.includes('CRITICAL');
  const isWarning = status.includes('WARNING');
  
  // Dynamic text color classes
  const statusColor = isCritical ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-emerald-400';
  // Dynamic glowing border effects for the camera container
  const glowEffect = isCritical ? 'shadow-[0_0_30px_rgba(239,68,68,0.3)] border-red-500/50' : 'border-gray-700/50';

  return (
    // 'min-h-screen' makes the dashboard take up the full height of your browser
    // We also added a dark radial gradient background for a premium feel
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 sm:p-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0a0a0a] to-[#0a0a0a]">
      
      {/* --- HEADER --- */}
      <header className="mb-8 flex items-center justify-between border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Crowd Stampede Monitor
          </h1>
          <p className="text-gray-400 mt-1 text-sm font-medium">Real-time Safety & Density Analytics</p>
        </div>
        
        {/* Live Status Indicator Bubble */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 backdrop-blur-sm">
          <div className={`w-3 h-3 rounded-full ${status === 'Disconnected' || status === 'Connecting...' ? 'bg-gray-500' : 'bg-emerald-500 animate-pulse'}`}></div>
          <span className="text-sm font-semibold tracking-wide text-gray-300">
            {status === 'Disconnected' || status === 'Connecting...' ? 'SYSTEM OFFLINE' : 'SYSTEM LIVE'}
          </span>
        </div>
      </header>

      {/* --- MAIN DASHBOARD GRID --- */}
      {/* We use CSS Grid to create a layout with columns (1 col on mobile, 3 on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Video Feed (Takes up 2 columns) */}
        {/* 'backdrop-blur-xl' gives it that modern frosted glass look */}
        <div className={`lg:col-span-2 bg-gray-900/40 backdrop-blur-xl rounded-2xl p-5 border transition-all duration-500 ${glowEffect}`}>
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold tracking-wide text-gray-200">Camera Feed 01</h2>
            {/* Show a pulsing warning badge if the situation is critical */}
            {isCritical && (
              <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30 animate-pulse">
                ACTION REQUIRED
              </span>
            )}
          </div>
          
          {/* This box holds our actual AI video feed streamed from Python */}
          <div className="aspect-video bg-black/80 flex flex-col items-center justify-center rounded-xl overflow-hidden relative">
            {/* If we have an image frame from Python, show it! Otherwise, show a loading spinner. */}
            {imageFrame ? (
              <img 
                src={`data:image/jpeg;base64,${imageFrame}`} 
                alt="Live Camera Feed" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center space-y-3">
                <div className="w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-400 font-medium text-sm">
                  {status === 'Disconnected' || status === 'Connecting...' ? 'Start your FastAPI backend to connect...' : 'Waiting for video stream...'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Stats Panel (Takes up 1 column) */}
        <div className="space-y-6">
          
          {/* Main Stat Card */}
          <div className="bg-gray-900/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 relative overflow-hidden">
            
            {/* Background Glow inside the card that changes color based on threat level */}
            <div className={`absolute -right-10 -top-10 w-32 h-32 blur-3xl opacity-20 rounded-full ${isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-emerald-500'}`}></div>

            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Live Diagnostics</h2>
            
            <div className="mb-8">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Density Count</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tight">{crowdCount}</span>
                <span className="text-gray-400 font-medium">people</span>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-800/60">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Threat Level</p>
              {/* This dynamic class changes the text color based on the word sent by Python */}
              <p className={`text-3xl font-black tracking-tight ${statusColor}`}>
                {status}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default App
