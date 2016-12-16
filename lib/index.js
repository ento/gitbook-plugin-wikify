'use strict';

const path = require('path');
const testAnythingProtocol = require('test-anything-protocol');
const textlintFormatter = require("textlint-formatter");
const fs = require('./asyncfs').fs;

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

// Why module-level: we need to keep track of book-global states
// across multiple `page` hook calls.
// Assuming a GitBook plugin is never reused to
// process another book, module-level variables are acceptable.
const paths = new Set();
const inboundLinks = {}; // path => Set

function addInboundLink(sourcePath, targetPath) {
  if (!inboundLinks.hasOwnProperty(targetPath)) {
    inboundLinks[targetPath] = new Set();
  }
  inboundLinks[targetPath].add(sourcePath);
}

function processPageLinks(locationUtils, tap, readmePath, paths, page) {
  const links = PageLinks.findGoodAndBadLinks(locationUtils, paths, page);
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
  hooks: {
    init: function() {
      // populate `paths`
      this.summary.walk(article => {
        paths.add(article.path);
      });
    },

    "page": function(page) {
      const logger = this.log;
      const tap = tapLogger(logger);
      const readmePath = this.config.get('structure.readme');

      return loadLocationUtils(this.gitbook.version)
        .then(locationUtils => {
          // rewrite links to directories as links to their index pages.
          DirectoryLinks.rewrite(locationUtils, paths, page);
          // update inbound links and report broken links.
          processPageLinks(locationUtils, tap, readmePath, paths, page);
          if (page.path !== readmePath) {
            Breadcrumbs.addBreadcrumbs(page, 'Top', readmePath);
          }
          return page;
        });
    },

    "finish": function() {
      // report number of pages checked for broken links as TAP test plan.
      const tap = tapLogger(this.log);
      tap.plan(paths.size);

      // output orphans as violations.
      const lintOutputPath = this.config.get('pluginsConfig.wikify.lintOutput')
      if (typeof lintOutputPath === 'string') {
        const readmePath = this.config.get('structure.readme');
        const lintMessages = Array.from(paths).map(path => {
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
