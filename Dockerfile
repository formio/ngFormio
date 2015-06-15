FROM node:0.12
MAINTAINER Randall Knutson <randall@form.io>

COPY . /src
WORKDIR /src

# node modules need to be compiled for the host platform.
RUN ./script.sh -bn

EXPOSE       80

CMD ["node", "/src/server.js"]
