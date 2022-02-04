#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

FROM node:16

# Configure apt
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get -y install --no-install-recommends apt-utils 2>&1

# Verify git and needed tools are installed
RUN apt-get install -y git procps

# Install Tex Live
RUN apt-get update && apt-get -y upgrade \
    && apt-get -y install --no-install-recommends texlive-base texlive-latex-base \
    && apt-get -y install --no-install-recommends biber latexmk make \
    && apt-get -y install --no-install-recommends texlive-lang-chinese \
    && apt-get -y install --no-install-recommends texlive-lang-japanese

# Clean up
RUN apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*
ENV DEBIAN_FRONTEND=dialog
