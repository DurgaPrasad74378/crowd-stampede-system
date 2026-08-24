import cv2
import json
import asyncio
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import asyncpg
from contextlib import asynccontextmanager
import os
import torch
import imageio
from dotenv import load_dotenv

# Crucial fix for 502 Bad Gateway on Render Free Tier (Memory/CPU limits)
torch.set_num_threads(1)

load_dotenv()  # Load environment variables from .env file

db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    print("Connecting to PostgreSQL...")
    try:
        # Connect to the database on startup
        db_pool = await asyncpg.create_pool(os.getenv("DATABASE_URL"))
        print("Connected to PostgreSQL successfully!")
    except Exception as e:
        print(f"Database connection error: {e}")
    
    yield # Let the app run
    
    # Close the database pool on shutdown
    if db_pool:
        await db_pool.close()

app = FastAPI(title="Crowd Stampede Early Warning API", lifespan=lifespan)

# Allow the React frontend to connect to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# YOLOv8 nano (yolov8n.pt) is used here because it is the fastest and best suited for real-time edge processing
print("Loading YOLOv8 model...")
model = YOLO("yolov8n.pt") 

def anonymize_persons(frame, boxes):
    """
    Applies a heavy Gaussian blur to detected persons to maintain privacy by design.
    This ensures no identifiable facial or biometric data is processed downstream.
    """
    for box in boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        # Extract the region of interest (the detected person)
        roi = frame[y1:y2, x1:x2]
        
        if roi.shape[0] > 0 and roi.shape[1] > 0:
            # Apply a strong blur to the region
            blurred_roi = cv2.GaussianBlur(roi, (99, 99), 30)
            frame[y1:y2, x1:x2] = blurred_roi
            
    return frame

@app.websocket("/ws/stream")
async def crowd_stream(websocket: WebSocket):
    """
    WebSocket endpoint that streams real-time crowd density metrics to the frontend.
    """
    await websocket.accept()
    
    # Use imageio to read the video because OpenCV on Render lacks FFmpeg codecs!
    video_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'crowd.mp4')
    
    try:
        print("DEBUG: Opening video with imageio...")
        reader = imageio.get_reader(video_path, 'ffmpeg')
        print("DEBUG: Video successfully opened with imageio!")
        
        # Loop forever so the stream never ends
        while True:
            for frame_rgb in reader:
                # Convert RGB (imageio format) to BGR (OpenCV format)
                frame = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)

                # Run YOLOv8 detection in a background thread so it doesn't freeze the server!
                # We use imgsz=320 (instead of 640) to drastically reduce RAM usage for the Free Tier
                results_list = await asyncio.to_thread(model, frame, classes=[0], verbose=False, imgsz=320)
                results = results_list[0]
            
            # Extract bounding boxes for detected people
            boxes = results.boxes
            person_count = len(boxes)

            # Uncomment the next line if you plan to stream or save the actual video frames later
            frame = anonymize_persons(frame, boxes) 

            # Basic risk calculation thresholds (adjust these based on your specific camera view)
            risk_status = "NORMAL"
            if person_count > 15:
                risk_status = "CRITICAL 🚨"
            elif person_count > 8:
                risk_status = "WARNING ⚠️"

            # Compress the image to JPEG, then convert to a Base64 string
            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')

            # Create the payload to send to the dashboard
            payload = {
                "person_count": person_count,
                "status": risk_status,
                "frame": frame_base64
            }
            
            await websocket.send_text(json.dumps(payload))
            
            if db_pool:
                try:
                    async with db_pool.acquire() as connection:
                        await connection.execute(
                            "INSERT INTO tracking_data (person_count, status) VALUES ($1, $2)",
                            person_count, risk_status
                        )
                except Exception as e:
                    print(f"Failed to insert data into DB: {e}")
            
            # Control the loop speed. 
            # 0.5 seconds = 2 Frames Per Second (FPS). Slower, but guarantees the free server won't crash!
            await asyncio.sleep(0.5)
            
    except WebSocketDisconnect:
        print("React dashboard disconnected from the WebSocket stream.")
    finally:
        # Always release the camera resource when the connection closes
        try:
            reader.close()
        except:
            pass