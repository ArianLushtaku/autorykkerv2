import os
import sys
import logging
from supabase import create_client, Client, ClientOptions
import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

supabase: Client = None

try:
    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    if not supabase_url or not supabase_key or "YOUR_SUPABASE" in supabase_url:
        raise ValueError("Supabase URL or Service Role Key is not configured correctly. Please check your .env file.")
    
    # Configure httpx to use HTTP/1.1, which can be more stable in some environments
    http_client = httpx.Client(http2=False)
    
    options = ClientOptions(httpx_client=http_client)
    supabase = create_client(supabase_url, supabase_key, options)
    logger.info("Successfully connected to Supabase.")
except (KeyError, ValueError) as e:
    logger.error(f"FATAL: Supabase configuration error: {e}")
    # The application will check for this None value and exit if it's not initialized.
