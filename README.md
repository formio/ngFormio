An Angular.js JSON form renderer for Form.io
--------------------------------------------
This library is meant to be used in conjunction with Form.io to provide dynamic JSON form rendering capabilities. This
allows you to render any form using the schemas provided by Form.io in the following format.

```
<formio src="'https://myapp.form.io/myform'"></formio>
```

The following snippit of code will dynamically render the form within Form.io, as well as automatically hook that form
up to the REST API generated from the same schema.

Installation
===================
You can install this library by typing the following command in your application.

```
bower install formio --save
```

Once you have this installed, you can add this library to your application with the following ```<script>``` tag.

```
<link rel='stylesheet' href='bower_components/formio/css/formio.css' />
<script src="bower_components/formio/dist/formio-full.min.js"></script>
```

You will now need to add this module within your Angular.js application declaration like so...

***app.js***
```
angular.module('yourApp', [
  'formio'
])
```

Usage
====================
Now that you have the library installed, you can then do the following to add a form to your application.

  - Create an account on https://form.io
  - Create a new project.
  - Create a Form within your project. This will then give you an API url like the following. ```https://myapp.form.io/myform```.
  - You can then embed this form within your application by providing the following.
  
  ```<formio src="'https://myapp.form.io/myform'"></formio>```
  
This not only renders the form dyanmically within your application, but also automatically hooks up that form to the API
backend that is provided from Form.io. 

Enjoy!

The Form.io Team!
