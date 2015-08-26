FROM formio/ubuntu-base:latest
MAINTAINER Randall Knutson <randall@form.io>

RUN apt-get update
COPY . /src
WORKDIR /src

# node modules need to be compiled for the host platform.
RUN npm rebuild

EXPOSE       80

ENTRYPOINT   ["node"]

CMD          ["server"]

# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
