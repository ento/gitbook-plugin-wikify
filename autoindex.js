'use strict';
const Wiki = require('./wiki');

module.exports = (contentRoot) => {
  return Wiki
    .index(contentRoot)
    .then(wiki => {
      return Wiki.generateIndexPages(wiki);
    })
    .then(wiki => {
      return Wiki.generateSummaryPage(wiki);
    });
};
