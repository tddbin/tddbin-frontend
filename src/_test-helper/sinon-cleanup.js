import sinon from 'sinon';

beforeEach(function() {
  this.sinon = sinon.createSandbox();
});

afterEach(function() {
  this.sinon.restore();
});
