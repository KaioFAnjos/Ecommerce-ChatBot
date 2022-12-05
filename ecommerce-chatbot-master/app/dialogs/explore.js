const builder = require('botbuilder');
const search = require('../search/search');

const extractQuery = (session, args) => {
  if (args && args.entities && args.entities.length) {
  
    const question = args.entities.find(e => e.type === 'Entity');
    const detail = args.entities.find(e => e.type === 'Detail');

    return `${(detail || { entity: '' }).entity} ${
      (question || { entity: '' }).entity
    }`.trim();
  } else if (session.message.text.split(' ').length <= 2) {
  
    return session.message.text.replace('please', '').trim();
  } else {
    return undefined;
  }
};

const listCategories = (session, subcategories, start = 0) => {
  
  const slice = subcategories.slice(start, start + 6);
  if (slice.length === 0) {
    return session.endDialog(
      "É isso. Você já viu tudo. Viu alguma coisa que você gosta? Basta pedir."
    );
  }

  const message = slice.map(c => c.title).join(', ');
  const more = start + slice.length < subcategories.length;

  if (!more) {
    session.endDialog(
      `Nós ${
        start > 0 ? 'também ' : ''
      }temos ${message}. Viu alguma coisa que você gosta? Basta pedir.`
    );
  } else {
    session.endDialog(
      `Nós ${start > 0 ? 'também ' : ''}temos ${message} e ${
        start > 0 ? 'até ' : ''
      }mais.` +
        (start > 0
          ? " Continue rolando se não vir o que você gosta."
          : ' Você pode percorrer a lista com "próximo" ou "mais"')
    );
  }
};

const listProducts = (session, products, start = 0) => {

  const slice = products.slice(start, start + 4);
  if (slice.length === 0) {
    return session.endDialog(
      "É isso. Você já viu tudo. Viu alguma coisa que você gosta? Basta pedir."
    );
  }

  const cards = slice.map(p =>
    new builder.ThumbnailCard(session)
      .title(p.title)
      .subtitle(`$${p.price}`)
      .text(p.description)
      .buttons([
        builder.CardAction.postBack(session, `@show:${p.id}`, 'Mostre-me')
      ])
      .images([
        builder.CardImage.create(session, p.image).tap(
          builder.CardAction.postBack(session, `@show:${p.id}`)
        )
      ])
  );

  if (start === 0) {
    session.send(
      `Eu encontrei ${
        products.length
      } produtos e aqui estão as melhores combinações. Toque na imagem para ver mais de perto.`
    );
  }

  session.sendTyping();
  session.endDialog(
    new builder.Message(session)
      .attachments(cards)
      .attachmentLayout(builder.AttachmentLayout.list)
  );
};

module.exports = function(bot) {
  bot.dialog('/explore', [
    function(session, args, next) {
      const query = extractQuery(session, args);

      if (!query) {
        
        builder.Prompts.text(
          session,
          'Desculpe, o que você gostaria que eu procurasse para você?'
        );
      } else {
        next({ response: query });
      }
    },
    function(session, args, next) {
      session.sendTyping();

      const query = args.response;

      search.find(query).then(({ subcategories, products }) => {
        if (subcategories.length) {
          session.privateConversationData = Object.assign(
            {},
            session.privateConversationData,
            {
              list: {
                type: 'categories',
                data: subcategories
              },
              pagination: {
                start: 0
              }
            }
          );
          session.save();

          listCategories(session, subcategories);
        } else if (products.length) {
          session.privateConversationData = Object.assign(
            {},
            session.privateConversationData,
            {
              list: {
                type: 'products',
                data: products
              },
              pagination: {
                start: 0
              }
            }
          );
          session.save();

          listProducts(session, products);
        } else {
          session.endDialog(
            `Tentei procurar por ${query} mas não encontrei nada, desculpe!`
          );
        }
      });
    }
  ]);

  bot.dialog('/next', [
    function(session, args, next) {
      if (
        !session.privateConversationData ||
        !session.privateConversationData.list
      ) {
        return session.endDialog('Desculpe, não tenho lista ativa para rolar');
      }

      const list = session.privateConversationData.list;
      const pagination = session.privateConversationData.pagination;

      switch (list.type) {
        case 'products':
          session.privateConversationData = Object.assign(
            {},
            session.privateConversationData,
            {
              pagination: {
                start: pagination.start + 4
              }
            }
          );
          session.save();

          return listProducts(session, list.data, pagination.start + 4);

        case 'categories':
          session.privateConversationData = Object.assign(
            {},
            session.privateConversationData,
            {
              pagination: {
                start: pagination.start + 6
              }
            }
          );
          session.save();

          return listCategories(session, list.data, pagination.start + 6);
      }

      session.endDialog(
        'Algo engraçado aconteceu e comecei a me perguntar quem eu sou.'
      );
    }
  ]);
};
