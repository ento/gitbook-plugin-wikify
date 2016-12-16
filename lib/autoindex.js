'use strict';
const Wiki = require('./wiki');

module.exports = (contentRoot, isFileIgnored) => {
  return Wiki
    .index(contentRoot, isFileIgnored)
    .then(wiki => {
      return Wiki.generateIndexPages(wiki);
    })
    .then(wiki => {
      return Wiki.generateSummaryPage(wiki);
    });
};
