import gradio as gr
from backend.main import app as fastapi_app
from backend.main import app as fastapi_app

# Create a tiny dummy Gradio UI just to satisfy Hugging Face
demo = gr.Blocks()
with demo:
    gr.Markdown("# ✅ Crowd Stampede Backend is Live and Running on 16GB RAM!")

# Mount our FastAPI app to the Gradio app
# Hugging Face will find this 'app' variable and automatically run our FastAPI server!
app = gr.mount_gradio_app(fastapi_app, demo, path="/")
