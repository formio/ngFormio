module.exports = function(width) {
  var host = process.env.HOST || 'https://form.io';
  var formioHost = process.env.FORMIOHOST || 'https://formio.form.io';
  var port = process.env.PORT || 80;

  if (port != 80) {
    host += ':' + port;
    formioHost += ':' + port;
  }

  var mongoAddr = process.env.MONGO_PORT_27017_TCP_ADDR || 'localhost';
  var mongoPort = process.env.MONGO_PORT_27017_TCP_PORT || 27017;
  var mongoCollection = process.env.MONGO_COLLECTION || 'formio';

  // TODO: Turn the rest of the config into environment variables.
  return {
    "host": host,
    "formioHost": formioHost,
    "debug": process.env.DEBUG || false,
    "port": port,
    "formio": {
      "mongo": "mongodb://" + mongoAddr + ":" + mongoPort + "/" + mongoCollection,
      "appSupport": true,
      "email": {
        "type": "sendgrid",
        "username": "formio",
        "password": "5a4tUUz1&rJ0"
      },
      "jwt": {
        "secret": "h3cb9%9H9y8p24uU4s",
        "expireTime": 240
      }
    }
  };
}

