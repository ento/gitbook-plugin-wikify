'use strict';

const path = require('path');
const testAnythingProtocol = require('test-anything-protocol');
const textlintFormatter = require("textlint-formatter");
const Promise = require('bluebird');
const open = require('./asyncfs').open;
const fs = require('./asyncfs').fs;

const PageIndex = require('./page_index');
const Breadcrumbs = require('./breadcrumbs');
const DirectoryLinks = require('./directory_links');
const PageLinks = require('./page_links');
const loadLocationUtils = require('./load_location_utils');

const tapLogger = function(gitbookLogger) {
  return testAnythingProtocol(function(err, message) {
    if (err !== null) {
      gitbookLogger.error.fail(err);
    } else {
      gitbookLogger.writeLn(message);
    }
  })
}

const pages = new Set();
const inboundLinks = {};

function addInboundLink(sourcePath, targetPath) {
  if (!inboundLinks.hasOwnProperty(targetPath)) {
    inboundLinks[targetPath] = new Set();
  }
  inboundLinks[targetPath].add(sourcePath);
}

function processPageLinks(locationUtils, tap, readmePath, pages, page) {
  const links = PageLinks.findGoodAndBadLinks(locationUtils, pages, page);
  // for each link, add to target's inboundLinks
  links.good.forEach(targetPath => {
    if (targetPath === readmePath) {
      return;
    }
    addInboundLink(page.path, targetPath);
  });
  // report bad links
  if (links.bad.length === 0) {
    tap.test({ok: true, description: 'links ok in ' + page.path});
  } else {
    tap.test({description: 'link broken in ' + page.path + ' -> ' + links.bad.join(', ')});
  }
}

module.exports = {
  // Map of hooks
  hooks: {
    init: function() {
      this.summary.walk(article => {
        pages.add(article.path);
      });
    },

    "page": function(page) {
      const logger = this.log;
      const readmePath = this.config.get('structure.readme');
      const tap = tapLogger(logger);

      return loadLocationUtils(this.gitbook.version)
        .then(locationUtils => {
          DirectoryLinks.rewrite(locationUtils, pages, page);
          processPageLinks(locationUtils, tap, readmePath, pages, page);
          if (page.path !== readmePath) {
            Breadcrumbs.addBreadcrumbs(page, 'Top', readmePath);
          }
          return page;
        });
    },

    "finish": function() {
      // number of pages checked for broken links
      const tap = tapLogger(this.log);
      tap.plan(pages.size);

      const lintOutputPath = this.config.get('pluginsConfig.gen-all.lintOutput')
      if (typeof lintOutputPath === 'string') {
        const readmePath = this.config.get('structure.readme');
        const lintMessages = Array.from(pages).map(path => {
          if (path === readmePath) return;
          const pageInbounds = inboundLinks[path];
          if (typeof pageInbounds === 'undefined' || pageInbounds.size === 0) {
            return {
              filePath: path,
              messages: [
                {message: 'orphaned', source: path, line: 1, column: 1}
              ]
            };
          }
        }).filter(Boolean);
        const formatter = textlintFormatter({formatterName: 'jslint-xml'});
        const lintOutput = formatter(lintMessages);
        return fs.writeFileAsync(lintOutputPath, lintOutput);
      }
    }
  }
};
