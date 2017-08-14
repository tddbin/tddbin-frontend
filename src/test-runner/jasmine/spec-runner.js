const jasmine = window.jasmine;
const env = jasmine.getEnv();

function consumeMessage(messageData) {
  const specCode = messageData.data;

  eval(specCode); // eslint-disable-line no-eval
  env.execute();
}

window.addEventListener('message', consumeMessage, false);
