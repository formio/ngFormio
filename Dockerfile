FROM ubuntu:14.04
MAINTAINER Randall Knutson <randall@form.io>

RUN apt-get install -y curl && curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
RUN apt-get update && apt-get install -y \
  build-essential \
  autoconf \
  nasm \
  zlib1g-dev \
  libpng-dev \
  libkrb5-dev \
  python \
  git \
  nodejs \
  mongodb-clients

COPY . /src
WORKDIR /src

# node modules need to be compiled for the host platform.
RUN ./scripts/setup.sh -bnrg

EXPOSE       80

ENTRYPOINT   ["node"]

CMD          ["server"]

# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
