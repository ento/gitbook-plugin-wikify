'use strict';
const Wiki = require('./wiki');

module.exports = (root) => {
  return Wiki
    .index(root)
    .then(wiki => {
      return Wiki.generateIndexPages(wiki);
    })
    .then(wiki => {
      Wiki.generateSummaryPage(wiki);
    });
};
