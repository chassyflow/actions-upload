# Use the minimal alpine image for faster startup time
FROM alpine:3.12.0

# Ensure python3 and pip is installed and configured
RUN apk add py3-pip

# Copy bake entrypoint routine
COPY src/pkg_upload.py /usr/local/bin/pkg_upload

# Ensure file is executable
RUN chmod +x /usr/local/bin/pkg_upload

ENTRYPOINT ["/usr/local/bin/pkg_upload"]
