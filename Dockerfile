FROM ubuntu:14.04
MAINTAINER Randall Knutson <randall@form.io>

RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
RUN apt-get update && apt-get install -y \
  build-essential \
  libkrb5-dev \
  python \
  git \
  nodejs

COPY . /src
WORKDIR /src

# node modules need to be compiled for the host platform.
RUN ./setup.sh -dbng

EXPOSE       80

ENTRYPOINT ["node"]

CMD ["/src/server.js"]

# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
