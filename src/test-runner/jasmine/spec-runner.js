var jasmine = window.jasmine;
var env = jasmine.getEnv();

function consumeMessage(messageData) {
  var specCode = messageData.data;

  eval(specCode); // eslint-disable-line no-eval
  env.execute();
}

window.addEventListener('message', consumeMessage, false);
