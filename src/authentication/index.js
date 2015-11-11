'use strict';

module.exports = function(formio) {

  /**
   * Authenticate a user via OAuth. Resolves with null if no user found
   *
   * @param form
   * @param providerName
   * @param oauthId
   * @param next
   *
   * @returns {Promise}
   */
  var authenticateOAuth = function(form, providerName, oauthId, next) {
    if (!providerName) {
      return next(new Error('Missing provider'));
    }
    if (!oauthId) {
      return next(new Error('Missing OAuth ID'));
    }

    return formio.resources.submission.model.findOne(
      {
        form: form._id,
        externalIds: {
          $elemMatch: {
            type: providerName,
            id: oauthId
          }
        },
        deleted: {$eq: null}
      }
    )
    .then(function(user) {
      if (!user) {
        return null;
      }

      // Respond with a token.
      var token = {
        user: {
          _id: user._id,
          roles: user.roles
        },
        form: {
          _id: form._id,
          project: form.project
        }
      };

      return {
        user: user,
        token: {
          token: formio.auth.getToken(token),
          decoded: token
        }
      };
    })
    .nodeify(next);
  };

  /**
   * Return the public methods.
   */
  return {
    authenticateOAuth: authenticateOAuth,
  };
};
