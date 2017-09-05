An Angular.js JSON form renderer for Form.io
--------------------------------------------
This library is meant to be used in conjunction with Form.io to provide dynamic JSON form rendering capabilities. This
allows you to render any form using the schemas provided by Form.io in the following format.

```
<formio src="'https://myapp.form.io/myform'"></formio>
```

The following snippit of code will dynamically render the form within Form.io, as well as automatically hook that form
up to the REST API generated from the same schema.

Here is a Demo
-----------------
http://codepen.io/travist/full/xVyMjo/

Multi-page Forms
-----------------
This renderer also supports multi-page forms using the ```formio-wizard``` directive like so.

```
<formio-wizard src="'https://myapp.form.io/mywizard'"></formio-wizard>
```

This directive uses Panels within the root of the form to indicate new pages within the form.

Installation
------------------
There are several ways to add this library to your application. Each of these installation types are for specific use
cases.

**Full Installation**
  - <strong>Includes:</strong> Everything including Angular.js and jQuery.
  - <strong>Usage:</strong> Use this installation if your application does not already have Angular and jQuery and you wish to display a single form on a page.
  - <strong>Installation:</strong>  Place the following within your application.
  
```  
<link rel="stylesheet" href="https://rawgit.com/formio/ngFormio/master/dist/formio-full.min.css" />
<script src="https://rawgit.com/formio/ngFormio/master/dist/formio-full.min.js"></script>
```
    
**Complete Installation**
  - <strong>Includes:</strong> Everything except Angular.js and jQuery
  - <strong>Usage:</strong> Use this if you are embedding a form within an application that already has Angular.js and jQuery installed.
  - <strong>Installation:</strong> Place the following within your application.
  
```
<link rel="stylesheet" href="https://rawgit.com/formio/ngFormio/master/dist/formio-complete.min.css" />
<script src="https://rawgit.com/formio/ngFormio/master/dist/formio-complete.min.js"></script>
```
    
**Basic Installation: (Bower Installation)**
  - <strong>Includes:</strong> Only the ngFormio renderer library with no dependencies.
  - <strong>Usage:</strong> When you wish to explicitely include all of the dependencies like when you are using [Wiredep](https://github.com/taptapship/wiredep).
  - <strong>Installation:</strong> We recommend using [Wiredep](https://github.com/taptapship/wiredep) for the Basic installation since it will wire up all the dependencies for you. You just need to place the following within your application.
  
    First install the dependency using <strong>Bower</strong>
    
```
bower install --save ng-formio
```
    
Then, you can add the following to your application.
  
```
<html>
  <head>
    <!-- bower:css -->
    <!-- endbower -->
  </head>
  <body>
    <!-- bower:js -->
    <!-- endbower -->
  </body>
</html>
```
    
Then run Wiredep to wire it up.
    
```
$ node
> require('wiredep')({ src: 'index.html' });
```
    
We also recommend using this within a [Gulp](http://gulpjs.com/) build process using Wiredep in combination with [Gulp UseRef](https://github.com/jonkemp/gulp-useref).
    
Configuration
-----------------
Once you have this installed, you will now need to add this module within your Angular.js application declaration like so...

***app.js***
```
angular.module('yourApp', [
  'formio'
])
```

Usage
--------------
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
