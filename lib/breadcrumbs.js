'use strict';
const path = require('path');
const cheerio = require('cheerio');
const DirectoryIndex = require('./directory_index');
const Directory = require('./directory');

class Breadcrumbs {
  static crumbsFor(pagePath) {
    const isIndex = path.basename(pagePath) === Directory.indexPageName;
    const crumbsPath = isIndex ? path.dirname(pagePath) : pagePath;
    const crumbs = DirectoryIndex.parents(crumbsPath).map(dir => {
      return {
        path: dir.indexPagePath,
        title: dir.basename,
        link: true
      };
    });
    crumbs.push({title: path.basename(crumbsPath), link: false});
    return crumbs;
  }

  /*
    page: {path, content}
   */
  static addBreadcrumbs(page, topTitle, topPath) {
    const $crumbs = cheerio('<nav>').addClass('wikify-breadcrumbs');
    $crumbs.append(createCrumb(topTitle, topPath));
    Breadcrumbs.crumbsFor(page.path)
      .forEach(function(crumb) {
        $crumbs.append(cheerio('<span>').addClass('wikify-breadcrumbs-sep').text(' > '));
        $crumbs.append(createCrumb(crumb.title, crumb.path));
      });

    page.content = cheerio.html($crumbs) + '\n' + (page.content || '');
  }
}

const createCrumb = (title, pagePath) => {
  if (pagePath !== undefined) {
    return cheerio('<a>')
      .addClass('wikify-breadcrumbs-link')
      .text(title)
      .attr('href', path.resolve(path.sep, pagePath));
  } else {
    return cheerio('<span>').addClass('wikify-breadcrumbs-static').text(title);
  }
};

module.exports = Breadcrumbs;
