'use strict';
const cheerio = require('cheerio');
const path = require('path');
const url = require('url');

class PageLinks {
  static findGoodAndBadLinks(locationUtils, paths, page) {
    const links = {good: [], bad: []};
    const $ = cheerio.load(page.content);
    $('a').each(function(i, el) {
      const href = $(el).attr('href');
      if (typeof href === 'undefined') return; // some empty link

      const target = url.parse(href);
      if (target.host !== null) return; // external link
      if (target.path === null) return; // probably just fragment

      const absTargetPath = path.resolve('/', path.dirname(page.path), target.path);
      const relTargetPath = absTargetPath.substring(1);

      if (relTargetPath === page.path) return; // link to myself

      if (paths.has(relTargetPath)) {
        links.good.push(relTargetPath);
      } else {
        links.bad.push(relTargetPath);
      }
    });
    return links;
  }

  static reportOrphanPages(tap) {
  }
}

module.exports = PageLinks;
