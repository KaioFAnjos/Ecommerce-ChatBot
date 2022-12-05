const builder = require('botbuilder');

module.exports = function(bot) {
  bot.dialog('/choseVariant', [
    function(session, args, next) {
      const item = (session.dialogData.product = args.product);

      if (!item.modifiers.includes('color')) {
        next();
      } else if (item.color.length === 1) {
        builder.Prompts.confirm(
          session,
          `${item.title} só vem em uma cor - ${
            item.color[0]
          }. Você gosta disso?`,
          {
            listStyle: builder.ListStyle.button
          }
        );
      } else {
        builder.Prompts.choice(
          session,
          `Por favor, selecione a cor que você mais gosta em seu ${item.title}`,
          item.color,
          {
            listStyle: builder.ListStyle.button
          }
        );
      }
    },
    function(session, args, next) {
      if (session.message.text === 'no') {
        return session.endDialog(
          "Bem, desculpe. Venha conferir da próxima vez. Talvez tenhamos na cor que você gostaria. Obrigado!"
        );
      }

      const item = session.dialogData.product;
      session.dialogData.color = args.response || item.color[0];
      session.save();

      if (!item.modifiers.includes('size')) {
        next();
      } else if (item.size.length === 1) {
        builder.Prompts.confirm(
          session,
          `${item.title} só vem em um tamanho - ${item.size[0]}. Tudo bem?`,
          {
            listStyle: builder.ListStyle.button
          }
        );
      } else {
        builder.Prompts.choice(
          session,
          `Selecione um tamanho para o seu ${item.title}`,
          item.size,
          {
            listStyle: builder.ListStyle.button
          }
        );
      }
    },
    function(session, args, next) {
      if (session.message.text === 'não' || session.message.text === 'nao') {
        return session.endDialog(
          "Bem, desculpe. Venha conferir da próxima vez. Talvez tenhamos seu tamanho em estoque. Obrigado!"
        );
      }

      const item = session.dialogData.product;

      session.dialogData.size = args.response || item.size[0];
      session.save();

      session.endDialogWithResult({
        response: {
          color: session.dialogData.color,
          size: session.dialogData.size
        }
      });
    }
  ]);
};
