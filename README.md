[![Build Status](https://travis-ci.org/tddbin/tddbin-frontend.svg)](https://travis-ci.org/tddbin/tddbin-frontend)
[![Dependency Status](https://david-dm.org/tddbin/tddbin-frontend.svg)](https://david-dm.org/tddbin/tddbin-frontend)
[![devDependency Status](https://david-dm.org/tddbin/tddbin-frontend/dev-status.svg)](https://david-dm.org/tddbin/tddbin-frontend#info=devDependencies)
[![Traffic stats](https://img.shields.io/badge/analytics-plausible-%236574cd.svg)](https://plausible.io/tddbin.com)
[![Codacy Badge](https://www.codacy.com/project/badge/52205d40abd9463b9f5dca236b12b997)](https://www.codacy.com/public/wk_2448/tddbin-frontend)

# TDDbin.com Frontend

[![Join the chat at https://gitter.im/tddbin/tddbin-frontend](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/tddbin/tddbin-frontend?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

This project contains all the UI stuff for [TDDbin], it is runnable separately
without any backend and aims to provide all components modularly.
Please [get involved on trello][trello] and [vote][trello] or [add ideas, comments, etc.][trello].
The highest ranked ideas will be the priority for us to implement.


# Development

## The short version using Nix (light-weight docker)

Run `nix-shell -p nodejs-7_x` and a nix-shell with Node.js installed will open.
Now, continue in the next chapter.

## The short version

In your shell: 
- `export KATAS_SERVICE_URL=https://katas.service.domain.local`, the domain where to find the katas locally 
  (is `katas.tddbin.com` when deployed)
- `git clone git@github.com:tddbin/tddbin-frontend.git; cd tddbin-frontend; npm install; npm run build; npm start`  

## The long version

In order to run this project locally make sure you have at least nodejs 0.10 installed 
- `node --version` should say so
and do the following:
- `git clone git@github.com:tddbin/tddbin-frontend.git` clone the repo on your machine
- `cd tddbin-frontend` go into the directory where the project was cloned into
- `npm install` installs all dependencies into the `node_modules` directory
- `npm test` runs all the tests of the project

Now you can 
- `export KATAS_SERVICE_URL=http://katas.service.domain.local`, the domain where to find the katas locally 
  (live it has this value `katas.tddbin.com`)
- `npm run build` for the first time and
- `npm start` starts [watchify] which continuously updates the built files 

and open the built version in the browser. Be sure to open the `dist` directory 
through a URL served by a local web server, such as an apache, nginx, etc.

## Using the katas service

All pre-built katas are hosted in [katas-service] repo. Which gets deployed to 
http://katas.tddbin.com from where all the katas can be loaded and which can be updated
independently, micro-service style :).   

### Do I need it?

If you want to work on the katas-service repo and want to load the katas into 
tddbin you might want to set up both repos to work with each other.  
Other than that there is no real need to set up katas-service.

### How to set it up

You don't need the [katas-service] to run locally, tddbin works also fully-functional without it.  
If you also want to use the [katas-service] locally, clone the repo and make it
available so that the env variable `KATAS_SERVICE_URL` points to where to find the `proxy.html`
served by the built katas-service.

## Coding style

The coding style is checked by running `npm run lint` using [jsxcs] a JSX-enabled fork of 
[jscs].
The applied style derives from the [google coding style][1]
as contained also in [jscs].

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
 
#### Jasmine-style (currently not working, see code)
It is enhanced with [referee], which provides jasmine-style expect methods.
The tests can be written the same way as with jasmine (for the biggest part) - at least
all standard matchers are available, for details see [the docs][2].

#### Should-style
Also should-style assertions can be used. Thanks to [Roman Liutikov][3]
pointing that out, it was added. On how to use them see the [should.js documentation][4].

## Custom runner
This architecture allows to add any kind of runner now.
The easiest way for now is to duplicate the mocha runner and the example
and get one up and file it as a pull request.

[TDDbin]: http://tddbin.com
[katas-service]: https://github.com/tddbin/katas-service
[watchify]: https://github.com/substack/watchify
[referee]: https://github.com/busterjs/referee
[jscs]: https://github.com/jscs-dev/node-jscs
[trello]: https://trello.com/b/FW1gUVxe/tddbin-com
[jsxcs]: https://github.com/orktes/node-jsxcs
[1]: https://github.com/jscs-dev/node-jscs/blob/master/presets/google.json
[2]: http://docs.busterjs.org/en/latest/modules/referee/#expectations
[3]: https://twitter.com/roman01la/status/496720629555798016
[4]: https://github.com/visionmedia/should.js#assertions
