# Use the minimal alpine image for faster startup time
FROM alpine:3.12.0

# Ensure python3 and pip is installed and configured
RUN apk add py3-pip

# Set the working directory to where GitHub Actions checks out the code
WORKDIR /github/workspace

# Copy bake entrypoint routine
COPY ./src/chassy-package-upload.py /usr/local/bin/chassy-package-upload

# Ensure file is executable
RUN chmod +x /usr/local/bin/chassy-package-upload

ENTRYPOINT ["/usr/local/bin/chassy-package-upload"]
