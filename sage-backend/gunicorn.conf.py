import os

# Bind to the port provided by Render
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# Use default sync workers — compatible with Python 3.14.
# gevent requires native C extensions that don't build on Python 3.14 yet.
worker_class = "sync"
workers = 2

# Increase timeout to 120s to handle Gemini audio/image API latency.
# Default is 30s — Gemini audio calls easily exceed that for longer clips.
timeout = 120

# Give workers 30s to finish in-flight requests on graceful reload
graceful_timeout = 30

# Keep-alive
keepalive = 5

# Logging
loglevel = "info"
accesslog = "-"
errorlog = "-"
