const greetings = [
  'olá',
  'Ei',
  'Oi',
  'Oi oi',
  'E aí',
  'saudação',
  'Bom dia',
  'Como você está?'
];

module.exports = {
  recognize: function(context, callback) {
    const text = context.message.text
      .replace(/[!?,.\/\\\[\]\{\}\(\)]/g, '')
      .trim()
      .toLowerCase();

    const recognized = {
      entities: [],
      intent: null,
      matched: undefined,
      expression: undefined,
      intents: [],
      score: 0
    };

    if (greetings.some(phrase => text === phrase)) {
      recognized.intent = 'Greeting';
      recognized.score = 1;
    }

    callback.call(null, null, recognized);
  }
};
