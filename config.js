module.exports = function(width) {
  var config = {
    "formio": {}
  };

  var host = process.env.HOST || 'https://form.io';
  var formioHost = process.env.FORMIOHOST || 'https://formio.form.io';
  var port = process.env.PORT || 80;

  if (port != 80) {
    host += ':' + port;
    formioHost += ':' + port;
  }
  config.host = host;
  config.port = port;
  config.formioHost = formioHost;
  config.debug = process.env.DEBUG || false;

  if (process.env.MONGO1) {
    config.formio.mongo = [];
    config.formio.mongo.push(process.env.MONGO1);
    if (process.env.MONGO2) {
      config.formio.mongo.push(process.env.MONGO2);
    }
    if (process.env.MONGO3) {
      config.formio.mongo.push(process.env.MONGO3);
    }
  }
  else {
    // This is compatible with docker linking.
    var mongoAddr = process.env.MONGO_PORT_27017_TCP_ADDR || 'localhost';
    var mongoPort = process.env.MONGO_PORT_27017_TCP_PORT || 27017;
    var mongoCollection = process.env.MONGO_COLLECTION || 'formio';
    config.formio.mongo = "mongodb://" + mongoAddr + ":" + mongoPort + "/" + mongoCollection;
  }

  config.formio.appSupport = process.env.APP_SUPPORT || true;

  if (process.env.SENDGRID_USERNAME) {
    config.formio.email.type = 'sendgrid';
    config.formio.email.username = process.env.SENDGRID_USERNAME;
    config.formio.email.password = process.env.SENDGRID_PASSWORD;
  }

  if (process.env.JWT_SECRET) {
    config.formio.jwt.secret = process.env.JWT_SECRET;
    config.formio.jwt.expireTime = process.env.JWT_EXPIRE_TIME || 240;
  }
  return config;

}

