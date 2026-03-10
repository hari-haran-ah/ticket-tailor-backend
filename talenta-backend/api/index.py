import os
import sys
import logging

# Configure logging to see errors in Vercel logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add root directory to sys.path so 'main' can be imported
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.append(root_dir)
    logger.info(f"Added {root_dir} to PYTHONPATH")

try:
    from main import app
    logger.info("Successfully imported FastAPI app from main.py")
except Exception as e:
    logger.error(f"CRITICAL: Failed to import app: {e}")
    # Re-raise to ensure Vercel records the crash with the traceback
    raise e
