const builder = require('botbuilder');
const search = require('../search/search');
//const recommendations = require('../recommendations');
const sentiment = require('../sentiment');

const lookupProductOrVariant = function(session, id, next) {
  session.sendTyping();

  return Promise.all([
    search.findProductById(id),
    search.findVariantById(id)
  ]).then(([products, variants]) => {
    if (products.length) {
      product = products[0];
      if (
        product.modifiers.length === 0 ||
        (product.size.length <= 1 && product.color.length <= 1)
      ) {
        session.sendTyping();

        return search
          .findVariantForProduct(product.id)
          .then(variant => ({ product, variant }));
      } else {
        session.reset('/showProduct', {
          entities: [
            {
              entity: id,
              score: 1,
              type: 'Product'
            }
          ]
        });
        return Promise.reject();
      }
    } else if (variants.length) {
      const variant = variants[0];

      return search
        .findProductById(variant.productId)
        .then(products => ({
          product: products[0],
          variant
        }))
        .catch(error => {
          console.error(error);
        });
    } else {
      session.endDialog(`I cannot find ${id} in my product catalog, sorry!`);
      return Promise.reject();
    }
  });
};

const describe = function(product, variant) {
  return (
    `${product.title} (${variant.sku})` +
    (!!variant.color ? `, Color - ${variant.color}` : '') +
    (!!variant.size ? `, Size - ${variant.size}` : '')
  );
};

module.exports = function(bot) {
  bot.dialog('/addToCart', [
    function(session, args, next) {
      if (!args) {
        return session.reset('/confused');
      }

      const id = builder.EntityRecognizer.findEntity(args.entities, 'Id');
      if (!id || !id.entity) {
        return session.reset('/confused');
      }

      lookupProductOrVariant(session, id.entity, next)
        .then(({ product, variant }) => next({ product, variant }))
        .catch(error => console.error(error));
    },
    function(session, args, next) {
      const product = args.product;
      const variant = args.variant;

      session.privateConversationData.cart = (
        session.privateConversationData.cart || []
      ).concat({
        product,
        variant
      });

      session.send(`I have added ${describe(product, variant)} to your cart`);

      next({ variant });
    },
    function(session, args, next) {
      
      session.reset('/showCart');
    }
    
  ]);
};
