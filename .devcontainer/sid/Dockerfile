FROM debian:sid-slim

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get -y install --no-install-recommends apt-utils 2>&1

# https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions
# https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions
RUN apt -y install curl
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# Verify git and needed tools are installed
RUN apt-get install --no-install-recommends -y git procps

# Install Tex Live
RUN apt-get update && apt-get -y upgrade \
    && apt-get -y install --no-install-recommends \
    texlive-latex-base \
    texlive-extra-utils \
    texlive-latex-extra \
    biber chktex latexmk make python3-pygments \
    texlive-lang-chinese \
    texlive-lang-japanese

# latexindent modules
RUN curl -L http://cpanmin.us | perl - App::cpanminus \
    && cpanm YAML::Tiny \
    && cpanm File::HomeDir \
    && cpanm Unicode::GCString

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
RUN apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*
ENV DEBIAN_FRONTEND=dialog \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8
