#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

FROM ubuntu:latest

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get -y install --no-install-recommends apt-utils=2.4.* 2>&1 

# Verify git and needed tools are installed
RUN apt-get install --no-install-recommends -y git=1:2.34.* procps=2:3.3.* 

# Install Tex Live
RUN apt-get update && apt-get -y upgrade \
    && apt-get -y install --no-install-recommends \
    texlive-latex-base=2021.20220204-* \ 
    texlive-extra-utils=2021.20220204-* \ 
    texlive-latex-extra=2021.20220204-* \ 
    biber=2.17-* chktex=1.7.* latexmk=1:4.76-* make=4.3-* python3-pygments=2.11.* python3-pkg-resources=59.6.* \ 
    texlive-lang-chinese=2021.20220204-* \ 
    texlive-lang-japanese=2021.20220204-* 

# latexindent modules
RUN apt-get install --no-install-recommends -y curl=7.81.* 
RUN curl -L http://cpanmin.us | perl - App::cpanminus \
    && cpanm Log::Dispatch::File \
    && cpanm YAML::Tiny \
    && cpanm File::HomeDir \
    && cpanm Unicode::GCString

# Clean up
RUN apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*
ENV DEBIAN_FRONTEND=dialog \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8
