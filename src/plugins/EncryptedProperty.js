'use strict';

/**
 * Inspired by:
 *  https://github.com/digitaledgeit/js-mongoose-encrypted-property/issues/1
 *  https://github.com/joegoldbeck/mongoose-encryption/issues/12
 */
var crypto = require('crypto');
var debug = require('debug')('formio:plugins:EncryptedProperty');

/**
 * Mongoose encrypted property plugin. Encrypt a single field on the given schema.
 *
 * @param {Schema} schema
 *   The mongoose schema to use.
 * @param {Object} options
 *   options.secret - The key used for crypto.
 *   options.plainName - The plainName used for the encrypted field.
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
   * Encrypt the given data with the given secret.
   *
   * @param {String} secret
   *   The key used for crypto.
   * @param {Object}
   *   The content to encrypt.
   *
   * @returns {Buffer}
   */
  function encrypt(secret, mixed) {
    if (!secret || !mixed) {
      return null;
    }

    var cipher = crypto.createCipher('aes-256-cbc', secret);
    var decryptedJSON = JSON.stringify(mixed);

    return Buffer.concat([
      cipher.update(decryptedJSON),
      cipher.final()
    ]);
  }

  /**
   * Decrypt some text
   *
   * @param {String} secret
   *   The key used for crypto.
   * @param {Buffer} cipherbuffer
   *   The content to decrypt.
   *
   * @returns {Object}
   *   Decrypted content.
   */
  function decrypt(secret, cipherbuffer) {
    if (!secret || !cipherbuffer) {
      return null;
    }

    var decipher = crypto.createDecipher('aes-256-cbc', secret);
    var decryptedJSON = Buffer.concat([
      decipher.update(cipherbuffer), // Buffer contains encrypted utf8
      decipher.final()
    ]);

    var data = {};
    try {
      data = JSON.parse(decryptedJSON);
    }
    catch(e) {}

    return data;
  }

  // Add a Buffer property to store the encrypted data
  var encryptedName = options.plainName + '_encrypted';
  var bufferProperty = {};
  bufferProperty[encryptedName] = 'Buffer';
  schema.add(bufferProperty);

  // Add a Virtual property to access with decrypted data
  schema.virtual(options.plainName)
    .get(function() {
      // Decrypt the value
      if (this[encryptedName]) {
        var plaintext = decrypt(options.secret, this[encryptedName]);
        debug('plaintext: ' + JSON.stringify(plaintext));
        return plaintext;
      }

      return null;
    })
    .set(function(value) {
      // Encrypt and set the value
      var ciphertext = encrypt(options.secret, value);
      debug('Encrypting: ' + JSON.stringify(value));
      this[encryptedName] = ciphertext;
    });

  // Decrypt data when converted using toJSON.
  schema.set('toJSON', {
    transform: function(doc, ret, opts) {
      delete ret[encryptedName];
      var temp = decrypt(options.secret, doc[encryptedName]);

      if (temp) {
        ret[options.plainName] = temp;
        debug('JSON Transform: ' + JSON.stringify(ret[options.plainName]));
      }

      debug(ret);
      return ret;
    }
  });

  // Decrypt data when converted using toObject.
  schema.set('toObject', {
    transform: function(doc, ret, opts) {
      delete ret[encryptedName];
      var temp = decrypt(options.secret, doc[encryptedName]);

      if (temp) {
        ret[options.plainName] = temp;
        debug('Object Transform: ' + JSON.stringify(ret[options.plainName]));
      }

      debug(ret);
      return ret;
    }
  });
};
