'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const request = require('request-promise-native');

const MoltinGateway = require('@moltin/sdk').gateway;
const Moltin = MoltinGateway({
  client_id: process.env.MOLTIN_CLIENT_ID,
  client_secret: process.env.MOLTIN_CLIENT_SECRET
});

if (!Moltin.Files) {
  
  Moltin.Files = Object.setPrototypeOf(
    Object.assign({}, Moltin.Products),
    Moltin.Products
  );
  Moltin.Files.endpoint = 'files';
}

(async function() {
  
  const images = (await Moltin.Files.All()).data;
  
  const imagesLookup = _.groupBy(images, image => image.id);

  
  const taxonomy = (await Moltin.Categories.Tree()).data;
  for (let topCategory of taxonomy) {
    for (let child of topCategory.children) {
      child.parent = topCategory;
    }
  }

  
  const categories = _.flatMap(taxonomy, category => category.children || []);
  
  const categoryLookup = _.groupBy(categories, category => category.id);

  
  const catalog = await (async function read(offset = 0, all = []) {
    Moltin.Products.Offset(offset);
    const { data, meta } = await Moltin.Products.All();

    all.push(...data);

    const total = meta.results.all;
    const processed =
      (meta.page.current - 1) * meta.page.limit + meta.results.total;

    return total > processed ? await read(processed, all) : all;
  })();

  
  const allProducts = catalog.filter(record => /^AW_\d+$/.test(record.sku));
  const allVariants = catalog.filter(record => !/^AW_\d+$/.test(record.sku));

  for (let variant of allVariants) {
    
    variant.description = JSON.parse(variant.description);
  }
 
  const variantsLookup = _.groupBy(allVariants, v => v.description.parent);

  console.log(`Collecting data for the categories index`);

  const categoryIndex = taxonomy.concat(categories).map(category => ({
    '@search.action': 'upload',
    id: category.id,
    title: category.name,
    description: category.description,
    parent: category.parent ? category.parent.id : null
  }));

  console.log(`Collecting data for the products index`);

  const productIndex = allProducts.map(product => {
    const categoryId = product.relationships.categories.data[0].id;

    const category = categoryLookup[categoryId][0];
    const variants = variantsLookup[product.id];

    const modifiers = _.chain(variants)
      .flatMap(variant =>
        _.without(Object.keys(variant.description), 'parent').filter(key =>
          Boolean(variant.description[key])
        )
      )
      .uniq()
      .value();

    const [color, size] = ['color', 'size'].map(modifier =>
      _.chain(variants)
        .map(variant => variant.description[modifier])
        .uniq()
        .filter(Boolean)
        .value()
    );

    const image = imagesLookup[product.relationships.main_image.data.id][0];

    return {
      '@search.action': 'upload',
      id: product.id,
      title: product.name,
      description: product.description,
      category: category.parent.name,
      categoryId: category.parent.id,
      subcategory: category.name,
      subcategoryId: category.id,
      modifiers: modifiers,
      color: color, 
      size: size,
      price: Number(product.price[0].amount),
      image: image.link.href
    };
  });

  console.log(`Collecting data for the variants index`);

  
  const variantIndex = allVariants.map(variant => {
    const [color, size] = ['color', 'size'].map(
      modifier => variant.description[modifier] || null
    );

    const image = imagesLookup[variant.relationships.main_image.data.id][0];

    return {
      '@search.action': 'upload',
      id: variant.id,
      productId: variant.description.parent,
      color: color,
      size: size,
      sku: variant.sku,
      price: Number(variant.price[0].amount),
      image: image.link.href
    };
  });

  const indexes = {
    categories: categoryIndex,
    products: productIndex,
    variants: variantIndex
  };

  const servicename = process.env.SEARCH_APP_NAME;
  const apikey = process.env.SEARCH_API_KEY;
  const headers = {
    'Content-Type': 'application/json',
    'api-key': apikey
  };

  for (let index of Object.keys(indexes)) {
    console.log('Deleting %s index in Azure Search', index);
    try {
      await request({
        url: `https://${servicename}.search.windows.net/indexes/${index}?api-version=2016-09-01`,
        headers,
        method: 'DELETE'
      });
    } catch (error) {
      console.error(error);
    }

    console.log('(Re)creating %s index in Azure Search', index);
    await request({
      url: `https://${servicename}.search.windows.net/indexes/${index}?api-version=2016-09-01`,
      headers,
      method: 'PUT',
      body: fs.createReadStream(path.resolve(__dirname, `${index}.json`))
    });

    console.log('Loading data for %s index in Azure Search', index);
    await request({
      url: `https://${servicename}.search.windows.net/indexes/${index}/docs/index?api-version=2016-09-01`,
      headers,
      method: 'POST',
      json: true,
      body: {
        value: indexes[index]
      }
    });
  }

  console.log('tudo funcionou');
})();
