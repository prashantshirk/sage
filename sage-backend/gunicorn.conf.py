import os

# Bind to the port provided by Render
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# Use gevent workers so long-running gRPC calls (Gemini audio/image)
# don't block the entire worker process. Sync workers time out at 30s
# by default and get SIGKILL'd mid-request.
worker_class = "gevent"
workers = 2
worker_connections = 1000

# Increase timeout to 120s to handle Gemini audio/image API latency.
# Gemini audio calls can take 20-60+ seconds depending on clip length.
timeout = 120

# Give workers 30s to finish in-flight requests on graceful reload
graceful_timeout = 30

# Silence keep-alive to free connections faster
keepalive = 5

# Logging
loglevel = "info"
accesslog = "-"
errorlog = "-"
