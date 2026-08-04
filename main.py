import cv2
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI(title="Crowd Stampede Early Warning API")

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
    
    # Initialize video capture. 
    # '0' uses your default webcam. 
    # If you want to test with a downloaded crowd video, change 0 to "path/to/video.mp4"
    cap = cv2.VideoCapture(0) 

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("Failed to grab frame or end of video stream.")
                break 

            # Run YOLOv8 detection targeting ONLY class 0 ('person')
            # verbose=False prevents the console from being spammed with log messages per frame
            results = model(frame, classes=[0], verbose=False)[0]
            
            # Extract bounding boxes for detected people
            boxes = results.boxes
            person_count = len(boxes)

            # Uncomment the next line if you plan to stream or save the actual video frames later
            # frame = anonymize_persons(frame, boxes) 

            # Basic risk calculation thresholds (adjust these based on your specific camera view)
            risk_status = "NORMAL"
            if person_count > 15:
                risk_status = "CRITICAL 🚨"
            elif person_count > 8:
                risk_status = "WARNING ⚠️"

            # Create the payload to send to the dashboard
            payload = {
                "person_count": person_count,
                "status": risk_status,
            }
            
            await websocket.send_text(json.dumps(payload))
            
            # Control the loop speed. 
            # 0.1 seconds = ~10 Frames Per Second (FPS), which is plenty for crowd monitoring and saves CPU.
            await asyncio.sleep(0.1) 
            
    except WebSocketDisconnect:
        print("React dashboard disconnected from the WebSocket stream.")
    finally:
        # Always release the camera resource when the connection closes
        cap.release()