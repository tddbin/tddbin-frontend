[![Build Status](https://travis-ci.org/tddbin/tddbin-frontend.svg)](https://travis-ci.org/tddbin/tddbin-frontend)
[![bitHound Score](https://www.bithound.io/tddbin/tddbin-frontend/badges/score.svg)](https://www.bithound.io/tddbin/tddbin-frontend)
![Dependencies Status](https://david-dm.org/tddbin/tddbin-frontend.png)
[![Codacy Badge](https://www.codacy.com/project/badge/857e4f48b2704d3bb3742bc5d78f8c40)](https://www.codacy.com/public/uxebu/tddbin-frontend.git)

# TDDbin.com Frontend

This project contains all the UI stuff for [TDDbin](http://tddbin.com), it is runnable separately
without any backend and aims to provide all components modularly.
Please [get involved on trello][trello] and [vote][trello] or [add ideas, comments, etc.][trello].
The highest ranked ideas will be the priority for us to implement.

[trello]: https://trello.com/b/FW1gUVxe/tddbin-com

# Development

In order to run this project locally do the following:
- `git clone git@github.com:uxebu/tddbin-frontend.git` clone the repo on your machine
- `cd tddbin-frontend` go into the directory where the project was cloned into
- `npm install` installs all dependencies into the `node_modules` directory
- `npm test` runs all the tests of the project

Now you can 
- once you need to do `npm run build` and
- `npm start` starts [watchify](https://github.com/substack/watchify) which continuously updates the built files 

and you can 
- served 
  or [http://localhost:8080/webpack-dev-server/](http://localhost:8080/webpack-dev-server/)
  get a directory listing where you can go into the `examples` folder and run any of them
- or go directly to any of
  - [http://localhost:8080/examples/editor.html](http://localhost:8080/examples/editor.html) a simple editor demo
  - [http://localhost:8080/examples/tddbin-standalone.html](http://localhost:8080/examples/tddbin-standalone.html) a simple TDDbin demo
  - [http://localhost:8080/examples/test-runner/mocha.html](http://localhost:8080/examples/test-runner/mocha.html) demo mocha runner demo

## Coding style

The coding style is checked by running `npm run lint` using [jsxcs](https://github.com/orktes/node-jsxcs) a JSX-enabled fork of 
[jscs](https://github.com/jscs-dev/node-jscs).
The applied style derives from the [google coding style](https://github.com/jscs-dev/node-jscs/blob/master/presets/google.json)
as contained also in the [jscs project](https://github.com/jscs-dev/node-jscs).

## How to contribute

In order to contribute please provide a pull request, add a description to what your code does and how it is useful.
It will be commented, discussed, maybe you need to adapt things and then it might be merged.

# Test runners

The execution of tests takes place in a separate component, which can be hooked in
where needed.
This way adding a new test runner (e.g. qunit, tap, etc.) will be easy as long as it
complies to the API that a test runner has to provide.

## Jasmine Runner
It is in this repo, but is not finished.
Due to jasmine's stubborn architecture that doesn't allow to reinstanciate it for a new test run
as it would be needed for a single page app I just left it ... it's basically unusable :(.
To try what it currently can do run the examples/test-runner/jasmine.html in your browser.

## Mocha Runner
The mocha runner is integrated and will most probably become the default runner.
For an example navigate in your browser to the examples/test-runner directory.

### Assertion APIs
Mocha is assertion API agnostic, it brings it's own assert() function by default, that can be used.
By adding plugins various other styles can be provided. See below which ones come with it.
 
#### Jasmine-style
It is enhanced with [referee](https://github.com/busterjs/referee), which provides jasmine-style expect methods.
The tests can be written the same way as with jasmine (for the biggest part) - at least
all standard matchers are available, for details see [the docs](http://docs.busterjs.org/en/latest/modules/referee/#expectations).

#### Should-style
Also should-style assertions can be used. Thanks to [Roman Liutikov](https://twitter.com/roman01la/status/496720629555798016)
pointing that out, it was added. On how to use them see the [should.js documentation](https://github.com/visionmedia/should.js#assertions).

## Custom runner
This architecture allows to add any kind of runner now.
The easiest way for now is to duplicate the mocha runner and the example
and get one up and file it as a pull request.
