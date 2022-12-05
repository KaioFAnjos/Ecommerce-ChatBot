const builder = require('botbuilder');
const sentiment = require('../sentiment');

const displayCart = function(session, cart) {
  const cards = cart.map(item =>
    new builder.ThumbnailCard(session)
      .title(item.product.title)
      .subtitle(`$${item.variant.price}`)
      .text(
        `${item.variant.color ? 'Color -' + item.variant.color + '\n' : ''}` +
          `${item.variant.size ? 'Size -' + item.variant.size : ''}` ||
          item.product.description
      )
      .buttons([
        builder.CardAction.imBack(
          session,
          `@remove:${item.variant.id}`,
          'Remove'
        )
      ])
      .images([builder.CardImage.create(session, item.variant.image)])
  );

  session.sendTyping();
  session.send(
    new builder.Message(
      session,
      `Você tem ${cart.length} produtos em seu carrinho.`
    )
      .attachments(cards)
      .attachmentLayout(builder.AttachmentLayout.carousel)
  );
};

module.exports = function(bot) {
  bot.dialog('/showCart', [
    function(session, args, next) {
      const cart = session.privateConversationData.cart;

      if (!cart || !cart.length) {
        session.send(
          'Seu carrinho de compras parece estar vazio. Posso ajudá-lo a encontrar alguma coisa?'
        );
        session.reset('/categories');
      } else {
        displayCart(session, cart);
        next();
      }
    },
    ...sentiment.confirm('Pronto para finalizar a compra?'),
    function(session, args, next) {
      if (args.response) {
        session.reset('/checkout');
      } else {
        session.endDialog('Claro, leve o seu tempo. Só me diga quando');
      }
    }
  ]);
};
