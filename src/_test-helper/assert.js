import './sinon-cleanup';
import nodeAssert from 'assert';
import sinon from 'sinon';

const assignFunctionsTo = (fromObj, toObj) => {
  Object.keys(fromObj)
    .forEach((key) => toObj[key] = fromObj[key]);
};

const assert = {};
assignFunctionsTo(nodeAssert, assert);
assignFunctionsTo(sinon.assert, assert);

export default assert;
