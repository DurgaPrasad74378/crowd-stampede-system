import { useState, useEffect } from 'react'

function App() {
  // These are "state" variables. When they change, React automatically updates the screen.
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
      // Every 0.1 seconds, Python sends us a JSON string. We parse it here:
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
          
          {/* This box holds our actual AI video feed streamed from Python */}
          <div className="aspect-video bg-black flex flex-col items-center justify-center rounded-lg border border-gray-600 overflow-hidden">
            {/* If we have an image frame from Python, show it! Otherwise, show text. */}
            {imageFrame ? (
              <img 
                src={`data:image/jpeg;base64,${imageFrame}`} 
                alt="Live Camera Feed" 
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <span className="text-gray-500 font-medium mb-2">
                  {status === 'Disconnected' || status === 'Connecting...' ? 'Camera Offline' : 'Loading Video...'}
                </span>
                <div className="text-sm text-gray-400">
                  {status === 'Disconnected' || status === 'Connecting...' ? 'Start your FastAPI backend to connect...' : 'Tracking objects via YOLOv8'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Stats Panel (Takes up 1 column) */}
        <div className="space-y-6">
          
          {/* Stats Card */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Current Status</h2>
            
            <div className="mb-4">
              <p className="text-gray-400 text-sm uppercase tracking-wide">Estimated Crowd</p>
              <p className="text-5xl font-bold">{crowdCount} <span className="text-lg font-normal text-gray-400">people</span></p>
            </div>

            <div>
              <p className="text-gray-400 text-sm uppercase tracking-wide">Threat Level</p>
              {/* This dynamic class changes the text color based on the word sent by Python */}
              <p className={`text-2xl font-bold mt-1 
                ${status.includes('NORMAL') ? 'text-green-500' : ''}
                ${status.includes('WARNING') ? 'text-yellow-500' : ''}
                ${status.includes('CRITICAL') ? 'text-red-500' : ''}
                ${status === 'Disconnected' || status === 'Connecting...' ? 'text-gray-500' : ''}
              `}>
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
