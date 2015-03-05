var jasmine = window.jasmine;
var env = jasmine.getEnv();

function consumeMessage(messageData) {
//  var sender = messageData.source;
  var specCode = messageData.data;

  eval(specCode);
  env.execute();
}

window.addEventListener('message', consumeMessage, false);
