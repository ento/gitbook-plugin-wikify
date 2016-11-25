'use strict';
const path = require('path');
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
      }
    })
    crumbs.push({title: path.basename(crumbsPath), link: false});
    return crumbs;
  }
}

module.exports = Breadcrumbs;
