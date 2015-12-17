FROM ubuntu:14.04
MAINTAINER Randall Knutson <randall@form.io>

RUN apt-get install -y curl && curl -sL https://deb.nodesource.com/setup_4.x | sudo bash -
RUN apt-get update && apt-get install -y \
  build-essential \
  autoconf \
  nasm \
  zlib1g-dev \
  libpng-dev \
  libkrb5-dev \
  python \
  git \
  nodejs

# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
