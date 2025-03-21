FROM texlive/texlive:latest

# https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions
# https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions
ENV DEBIAN_FRONTEND=noninteractive
RUN apt -y install curl
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# VS Code dependencies for testing
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends \
    libnss3-dev \
    libdbus-1-dev \
    libatk-bridge2.0-dev \
    libdrm-dev \
    libgtk-3-dev \
    libasound2-dev


# Clean up
RUN apt autoremove -y \
    && apt clean -y \
    && rm -rf /var/lib/apt/lists/*
ENV DEBIAN_FRONTEND=dialog
