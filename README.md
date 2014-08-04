# TDDbin frontend

This project contains all the UI stuff for TDDbin, it should be runnable separately
without any backend and aims to provide all components modularly.

# Test runners

The execution of tests takes place in a separate component, which can be hooked in
where needed.
This way adding a new test runner (e.g. qunit, tap, etc.) will be easy as long as it
complies to the API that a test runner has to provide.

## Embedded Jasmine Runner
It is in this repo, but is not finished.
Due to jasmine's stubborn architecture that doesn't allow to reinstanciate it for a new test run
as it would be needed for a single page app I just left it ... it's basically unusable :(.
To try what it currently can do run the examples/embedded-jasmine.html in your browser.

## Embedded Mocha Runner
The mocha runner is integrated and will most probably become the default runner.
It is enhanced with [referee](https://github.com/busterjs/referee), which provides jasmine-style expect methods.
The tests can be written the same way as with jasmine (for the biggest part) - at least
all standard matchers are available, for details see [the docs](http://docs.busterjs.org/en/latest/modules/referee/#expectations).

