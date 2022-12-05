module.exports = function(bot) {
  bot.dialog('/welcome', [
    function(session, args, next) {
      const lastVisit = session.userData.lastVisit;

      session.send(['Olá!', 'Oi!']);

      if (!lastVisit) {
        session.send(
          'Nossa loja vende bicicletas, peças, acessórios e artigos esportivos'
        );
        session.userData = Object.assign({}, session.userData, {
          lastVisit: new Date()
        });
        session.save();
      } else {
        session.send("Que bom que você voltou!");
      }

      session.endDialog('Como posso ajudá-lo?');
    }
  ]);
};
