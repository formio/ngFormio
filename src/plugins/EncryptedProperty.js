'use strict';

/**
 * Inspired by:
 *  https://github.com/digitaledgeit/js-mongoose-encrypted-property/issues/1
 *  https://github.com/joegoldbeck/mongoose-encryption/issues/12
 */
var crypto = require('crypto');

/**
 * Encrypted property plugin
 *
 * @param   {Schema}  schema
 * @param   {Object}  options
 * @param   {String}  options.secret
 * @param   {String}  options.plainName
 */
module.exports = function(schema, options) {
  // Validate options
  options = options || {};
  if (!options.secret) {
    throw new Error('Please specify option.secret');
  }
  if (!options.plainName) {
    throw new Error('Please specify option.plainName');
  }

  /**
   * Encrypt some text
   * @param   {String} secret
   * @param   {Object} mixed
   * @returns {Buffer}
   */
  function encrypt(secret, mixed) {
    if (mixed === undefined) {
      return undefined;
    }

    var cipher = crypto.createCipher('aes-256-cbc', secret);
    var decryptedJSON = JSON.stringify(mixed);

    return Buffer.concat([
      cipher.update(decryptedJSON),
      cipher.final()
    ]);
  };

  /**
   * Decrypt some text
   *
   * @param   {String} secret
   * @param   {Buffer} cipherbuffer
   * @returns {Object}
   */
  function decrypt(secret, cipherbuffer) {
    if (cipherbuffer === undefined) {
      return undefined;
    }

    var decipher = crypto.createDecipher('aes-256-cbc', secret);
    var decryptedJSON = Buffer.concat([
        decipher.update(cipherbuffer), // Buffer contains encrypted utf8
        decipher.final()
    ]);

    return JSON.parse(decryptedJSON);  // This can throw a exception
  };

  // Add a Buffer property to store the encrypted data
  var encryptedName = options.plainName + '_encrypted';
  var bufferProperty = {};
  bufferProperty[encryptedName] = 'Buffer';
  schema.add(bufferProperty);

  // Add a Virtual property to access with decrypted data
  schema.virtual(options.plainName).get(function() {
    // Decrypt the value
    if (this[encryptedName]) {
      return decrypt(options.secret, this[encryptedName]);
    }
    return undefined;
  })
  .set(function(value) {
    // Encrypt and set the value
    this[encryptedName] = encrypt(options.secret, value);
  });

  // decrypt data when converted toJSON
  // FIXME.  This may not work with more than one encrypted field
  schema.set('toJSON', {
    transform: function(doc, ret, opts) {
      delete ret[encryptedName];
      ret[options.plainName] = decrypt(options.secret, doc[encryptedName]);
      return ret;
    }
  });
};
