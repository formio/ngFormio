/**
 * Simple utility function to resize an array after elements have been removed.
 *
 * @param arr
 *   The array to resize.
 * @returns {Array}
 */
var resizeArray = function(arr) {
  if (!(arr instanceof Array)) {
    return [];
  }

  var ret = [];
  arr.forEach(function(element) {
    if (typeof element !== 'undefined') {
      ret.push(element);
    }
  });

  return ret;
};

/**
 * Update the collections in mongo.
 */
var updateMongo = function() {
  db.schema.createIndex({key: 1});

  db.applications.update({}, {$set: {owner: null}}, {multi: true});
  db.applications.createIndex({owner: 1});
  db.applications.update({}, {$set: {defaultAccess: null}}, {multi: true});

  db.createCollection('roles');
  db.roles.createIndex({app: 1});

  db.forms.update({}, {$set: {submissionAccess: []}}, {multi: true});
  db.forms.update({}, {$set: {owner: null}}, {multi: true});
  db.forms.createIndex({owner: 1});

  db.submissions.update({}, {$set: {owner: null}}, {multi: true});
  db.submissions.createIndex({owner: 1});
  db.submissions.update({}, {$set: {roles: []}}, {multi: true});
  db.submissions.createIndex({roles: 1});
};

/**
 * Delete major orphan entities.
 */
var pruneMongo = function() {
  // Prune orphan forms.
  db.forms.find().forEach(function(form) {
    var app = db.applications.findOne({_id: form.app});

    if (!app) {
      // remove all forms associated with deleted applications.
      db.forms.remove({app: form.app});

      // remove all submissions associated with deleted applications and forms.
      db.submissions.remove({form: form._id});

      // remove all actions associated with deleted applications.
      db.actions.remove({form: form._id});
    }
  });

  // Prune orphan submissions.
  db.submissions.find().forEach(function(submission) {
    var form = db.forms.findOne({_id: submission.form});

    if (!form) {
      // remove all submissions associated with a deleted form.
      db.submissions.remove({form: submission.form});

      // remove all actions associated with a deleted form.
      db.actions.remove({form: submission.form});
    }
  });

  // Prune orphan form actions.
  db.actions.find().forEach(function(action) {
    var form = db.forms.findOne({_id: action.form});

    if (!form) {
      // remove all actions associated with a deleted form.
      db.actions.remove({form: action.form});

      // remove all submissions associated with a deleted form.
      db.actions.remove({form: action.form});
    }
  });
};

/**
 * Update the Application Model.
 */
var updateApplications = function() {
  var applications = db.applications.find();
  applications.forEach(function(application) {
    // For each application, create 3 roles: Administrator, Authenticated, and Anonymous.
    db.roles.insert({title: 'Administrator', description: 'The Administrator Role.', app: application._id});
    db.roles.insert({title: 'Authenticated', description: 'The Authenticated Role.', app: application._id});
    db.roles.insert({title: 'Anonymous', description: 'The Anonymous Role.', app: application._id});

    // Query the application roles.
    var anonymous = db.roles.findOne({app: application._id, title: 'Anonymous'});
    var authenticated = db.roles.findOne({app: application._id, title: 'Authenticated'});
    var administrator = db.roles.findOne({app: application._id, title: 'Administrator'});

    // Assign the application owner.
    var access = application.access;
    if (access.length === 1) {
      // Assign the only person defined to have access, as the owner.
      application.owner = access[0].id;
    }
    else if (access.length === 2) {
      // Give application ownership to the user who is not travist.
      access.forEach(function(user) {
        if (user.id && user.id.valueOf() !== '553dbfc08d22d5cb1a7024f2') {
          application.owner = user.id;
        }
      });
    }
    else {
      // Default to give travist access so he can give access to those who need it.
      application.owner = '553dbfc08d22d5cb1a7024f2';
    }

    // Assign the anonymous role to the applications defaultAccess role
    application.defaultAccess = anonymous._id;

    // Give all known roles access to view the application, and admins the ability to update it.
    application.access = [
      {type: 'read_all', roles: [anonymous._id, authenticated._id, administrator._id]},
      {type: 'update_all', roles: [administrator._id]}
    ];

    // Save the updated application to the db.
    db.applications.update({_id: application._id}, application);
  });
};

/**
 * Update the Form Model.
 */
var updateForms = function() {
  var forms = db.forms.find();
  forms.forEach(function(form) {
    // confirm each form references a valid application

    // Fix forms without access defined - db.forms.find({'access.0': {$exists: false}});
    var access = form.hasOwnProperty('access')
      ? form.access
      : [];

    // Determine if anonymous has access to this form.
    var anonymousAccess = false;
    if (access.length > 0) {
      for (var i in access) {
        if (access[i].id && access[i].id.valueOf() === '000000000000000000000000') {
          // Acknowledge anonymous access and remove it from the array.
          anonymousAccess = true;
          delete access[i];
        }
      }

      // Remove any anonymous elements
      access = resizeArray(access);

      // Assign the owner of the form based on the remaining users with access.
      switch (access.length) {
        case 1:
          // Assign the only person defined to have access, as the owner.
          form.owner = access[0].id;
          break;
        case 2:
          // Give application ownership to the user who is not travist.
          access.forEach(function(user) {
            if (user.id && user.id.valueOf() !== '553dbfc08d22d5cb1a7024f2') {
              form.owner = user.id;
            }
          });
        default:
          // Assign the owner of the application as the owner of this form, if no applicable owner was found.
          if (!form.owner) {
            var app = db.applications.findOne({_id: form.app});
            form.owner = app.owner;
          }
          break;
      }
    }
    else {
      // printjson('null:');
      // printjson(form._id);
      form.owner = null;
    }

    // Update the form access variables.
    form.access = [];
    form.submissionAccess = [];

    // If anonymous access is defined, attach the anonymous access to the form.
    if (anonymousAccess) {
      // query the application for its default role.
      var application = db.applications.findOne({_id: form.app});

      // Give the applications defaultAccess role (Anonymous) read access to the form.
      form.access.push({type: 'read_all', roles: [application.defaultAccess]});

      // Grant the Anonymous user CRUD access to submissions.
      form.submissionAccess.push(
        {type: 'create_own', roles: [application.defaultAccess]},
        {type: 'read_own', roles: [application.defaultAccess]},
        {type: 'update_own', roles: [application.defaultAccess]},
        {type: 'delete_own', roles: [application.defaultAccess]}
      );
    }

    // If other users are present attach the authenticated roles.
    if (access.length > 0) {
      var authenticated = db.roles.findOne({app: form.app, title: 'Authenticated'});

      // Iterate each role and add the authenticated role to the read_all permission.
      var done = false;
      form.access.forEach(function(element) {
        if (element.type === 'read_all') {
          done = true;
          element.roles.push(authenticated._id);
        }
      });

      // If the read_all permission was not defined for anonymous, add it for authenticated users.
      if (!done) {
        form.access.push({type: 'read_all', roles: [authenticated._id]});
      }

      // Give authenticated users crud permissions for their own resources.
      if (form.submissionAccess.length > 0) {
        form.submissionAccess.forEach(function(element) {
          // Ensure only CRUD _own roles are updated.
          switch (element.type) {
            case 'create_own':
            case 'read_own':
            case 'update_own':
            case 'delete_own':
              element.roles.push(authenticated._id);
              break;
          }
        });
      }
      else {
        form.submissionAccess.push(
          {type: 'create_own', roles: [authenticated._id]},
          {type: 'read_own', roles: [authenticated._id]},
          {type: 'update_own', roles: [authenticated._id]},
          {type: 'delete_own', roles: [authenticated._id]}
        );
      }
    }

    //  Add the admin role to the form permissions regardless of access contents..
    var administrator = db.roles.findOne({app: form.app, title: 'Administrator'});
    // Add the admin role to the CRUD _all permission of the form.
    form.access.forEach(function(element) {
      element.roles.push(administrator._id);
    });
    // Add the admin role to the remaining CRUD operations of the form.
    form.access.push(
      {type: 'update_all', roles: [administrator._id]},
      {type: 'delete_all', roles: [administrator._id]}
    );

    // Give admin users crud permissions for all submissions.
    form.submissionAccess.push(
      {type: 'create_all', roles: [administrator._id]},
      {type: 'read_all', roles: [administrator._id]},
      {type: 'update_all', roles: [administrator._id]},
      {type: 'delete_all', roles: [administrator._id]}
    );

    // Update this form to reflect schema changes.
    db.forms.update({_id: form._id}, form);
  });
};

/**
 * Update the Submission Model.
 */
var updateSubmission = function() {
  var submissions = db.submissions.find();
  submissions.forEach(function(submission) {
    var access = submission.access;
    var form = db.forms.findOne({_id: submission.form});
    var application = db.applications.findOne({_id: form.app});
    submission.owner = null;

    // Store the two submission id's that cant be the owner.
    var travist = '553dbfc08d22d5cb1a7024f2';
    var owner = application.owner
      ? application.owner.valueOf()
      : null;

    // Attempt to update the owner of the submission.
    switch (access.length) {
      case 1:
        // Assign the only person in the access array to the owner, if they arent travist or the application owner.
        submission.owner = (access[0].id && (access[0].id.valueOf() !== travist) && (access[0].id.valueOf() !==  owner))
          ? access[0].id
          : null;
        break;
      case 2:
        // Iterate the access list to find the first person who isnt travist or the application owner.
        access.forEach(function(user) {
          // Give application ownership to the user who is not travist or the application owner.
          if (user.id && (user.id.valueOf() !== travist) && (user.id.valueOf() !==  owner)) {
            submission.owner = user.id;
          }
        });
        break;
    }

    // If the submission does not have an owner, assign itself as the owner (submissions that should have self ownership).
    if (!submission.owner) {
      submission.owner = submission._id;
    }

    // Attach the applications authenticated role to every existing submission.
    var authenticated = db.roles.findOne({app: application._id, title: 'Authenticated'});
    submission.roles = [authenticated._id];

    // Update this submission to reflect schema changes.
    db.submissions.update({_id: submission._id}, submission);
  });
};

/**
 * Attach the role to each of the given users.
 */
var addRoleToUsers = function(role, users) {
  users.forEach(function(member) {
    member = ObjectId(member);

    var result = db.submissions.findAndModify({
      query: {_id: member},
      update: { $addToSet: {roles: role}}
    });
  });
}

/**
 * Update specific submissions related to some formio developers.
 */
var updateFormioDevelopers = function() {
  var travist = '553dbfc08d22d5cb1a7024f2';
  var zack = '5548197326295b0f23f253fe';
  var gary = '553e5db64f99b2051b3a7c4e';
  var denise = '5563a5c02453dd8140146f11';
  var randall = '55673dc04f0405dd28205bb7';
  var team = [travist, zack, gary, denise, randall];

  var formioAdmin = db.roles.findOne({app: ObjectId('553db92f72f702e714dd9778'), title: 'Administrator'});
  addRoleToUsers(formioAdmin._id, team);

  var boardmanAdmin = db.roles.findOne({app: ObjectId('552b2297d70ef854300001e5'), title: 'Administrator'});
  addRoleToUsers(boardmanAdmin._id, [travist]);
};

/**
 * Update the formio registration form to have a RoleAction for the Authenticated user role.
 */
var updateFormioRegisterForm = function() {
  var authenticated = db.roles.findOne({app: ObjectId('553db92f72f702e714dd9778')});

  db.actions.insert({
    form: ObjectId('553dbedd3c605f841af5b3a7'),
    title: 'Add Role',
    name: 'role',
    handler: ['after'],
    method: ['create'],
    priority: 1,
    settings: {
      association: 'new',
      type: 'add',
      role: authenticated._id
    }
  });
};

// Invoke all the update methods..
updateMongo();
pruneMongo();
updateApplications();
updateForms();
updateSubmission();
updateFormioDevelopers();
updateFormioRegisterForm();

/**
 * Remove and update all mongo collections once old data is no longer needed.
 */
var finalizeMongoChanges = function() {
  // Finalize the submissions collection by deleting the access field.
  db.submissions.update({access: {$exists: true}}, {$unset: {access: 1}}, {multi: true});
};

// Clean up the mongo collections
finalizeMongoChanges();

/**
 * Confirm the integrity of every application.
 */
var confirmApplicationUpdate = function() {
  // Every application should have an owner field.
  var a = db.applications.find({'owner': {$exists: false}});
  printjson('Applications w/o owner field: ' + a.count());

  // Every application should have an owner.
  var b = db.applications.find({'owner': null});
  printjson('Applications w/o owner: ' + b.count());

  // Every application should have a non-empty access list.
  var c = db.applications.find({$or: [
    {'access': {$exists: false}},
    {'access.0': {$exists: false}}
  ]});
  printjson('Applications w/ empty access list: ' + c.count());

  // Every application should have a defaultAccess id
  var d = db.applications.find({'defaultAccess': {$exists: false}});
  printjson('Applications w/o defaultAccess: ' + d.count());
};

/**
 * Confirm the integrity of every form.
 */
var confirmFormUpdate = function() {
  // Every form should have an owner field.
  var a = db.forms.find({'owner': {$exists: false}});
  printjson('Forms w/o owner field: ' + a.count());

  var b = db.forms.find({'owner': null});
  printjson('Forms w/o owner: ' + b.count());

  // Every form should have a non-empty access list.
  var c = db.forms.find({$or: [
    {'access': {$exists: false}},
    {'access.0': {$exists: false}}
  ]});
  printjson('Forms w/ empty access list: ' + c.count());

  // Every application should have submissionAccess defined
  var d = db.forms.find({$or: [
    {'submissionAccess': {$exists: false}},
    {'submissionAccess.0': {$exists: false}}
  ]});
  printjson('Forms w/ empty submissionAccess list: ' + d.count());
};

/**
 * Confirm the integrity of every submission.
 */
var confirmSubmissionUpdate = function() {
  // Every submission should have an owner field.
  var a = db.submissions.find({'owner': {$exists: false}});
  printjson('Submissions w/o owner field: ' + a.count());

  // Some submissions can potentially not have owners.
  var b = db.submissions.find({'owner': null});
  printjson('Submissions w/o owner: ' + b.count());

  // Every submission should have roles, possibly null.
  var c = db.submissions.find({'roles': {$exists: false}});
  printjson('Submissions w/o roles list: ' + c.count());
};

confirmApplicationUpdate();
confirmFormUpdate();
confirmSubmissionUpdate();

db.schema.update({key: 'formio'}, { $set: { version: '1.0.0', isLocked: false}}, {upsert: true});
