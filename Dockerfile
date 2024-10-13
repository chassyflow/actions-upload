# Use the minimal alpine image for faster startup time
FROM alpine:3.12.0

# Ensure python3 and pip is installed and configured
RUN apk add py3-pip

WORKDIR /action/workspace
COPY requirements.txt /action/workspace/

RUN python3 -m pip install --no-cache-dir -r requirements.txt

# Copy bake entrypoint routine
COPY src/chassy-package-upload.py /usr/local/bin/chassy-package-upload
COPY src/test_script.sh /usr/local/bin/test_script

# Ensure file is executable
RUN chmod +x /usr/local/bin/chassy-package-upload
RUN chmod +x /usr/local/bin/test_script

# ENTRYPOINT ["/usr/local/bin/chassy-package-upload"]
ENTRYPOINT ["python3" "/usr/local/bin/chassy-package-upload"]
