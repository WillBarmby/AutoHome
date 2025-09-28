import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Support running both as "python -m uvicorn backend.main:app" and
# from the backend directory with "python -m uvicorn main:app"
if __package__:
    from .app import app
else:  # executed when imported as a top-level module (no package context)
    backend_dir = Path(__file__).resolve().parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    from app import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
