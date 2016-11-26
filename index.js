'use strict';

const fs = require('fs-extra');
const path = require('path');
const url = require('url');
const cheerio = require('cheerio');
const testAnythingProtocol = require('test-anything-protocol');

const PageIndex = require('./page_index');
const Breadcrumbs = require('./breadcrumbs');


const tapLogger = function(gitbookLogger) {
  return testAnythingProtocol(function(err, message) {
    if (err !== null) {
      gitbookLogger.error.fail(err);
    } else {
      gitbookLogger.writeLn(message);
    }
  })
}

// TODO: need to generate summary before gitbook build
module.exports = {
  // Map of hooks
  hooks: {
    config: function(config) {
      this.summary.walk(article => {
        console.log(article);
      })
    },
    "page:before": function(page) {
      if (page.path === this.config.get('structure.readme')) {
        return page;
      }
      // generate breadcrumbs
      const crumbs = [{
        path: this.config.get('structure.readme'),
        title: 'Top',
        link: true
      }];
      const links = crumbs
            .concat(Breadcrumbs.crumbsFor(page.path))
            .map(function(crumb) {
              if (crumb.link) {
                return '[' + crumb.title + '](/' + crumb.path + ')';
              } else {
                return crumb.title;
              }
            });
      const crumbline = links.join(' > ');
      page.content = crumbline + '\n\n' + page.content;
      return page;
    },

    "page": function(page) {
      const tap = tapLogger(this.log);
      const absReadmePath = path.resolve('/', this.config.get('structure.readme'));
      // for each link, add to target's inboundLinks
      // if target is not found, report as broken links
      const $ = cheerio.load(page.content);
      $('a').each(function(i, el) {
        const href = $(el).attr('href');
        if (typeof href === 'undefined') return; //some empty link

        const target = url.parse(href);
        if (target.host !== null) return; // external link
        if (target.path === null) return; // probably just fragment

        const absTargetPath = path.resolve('/', path.dirname(page.path), target.path);
        if (absTargetPath === absReadmePath) return; // readme

        const relTargetPath = absTargetPath.substring(1);
        // TODO: wiki: rewrite directory link to _index.md link in page:before
        const maybeIndexPath = path.join(relTargetPath, '_index.md');

        if (PageIndex.hasPath(pageIndex, maybeIndexPath)) {
          targetPage = PageIndex.getByPath(pageIndex, maybeIndexPath);
        } else if (PageIndex.hasPage(pageIndex, relTargetPath)) {
          targetPage = PageIndex.getByPath(pageIndex, relTargetPath);
        }
        if (targetPage === null) {
          tap.test({description: 'link broken in ' + page.path + ' -> ' + relTargetPath});
        } else {
          targetPage.inboundLinks.add(page.path);
          tap.test({ok: true, description: 'link ok in ' + page.path + ' -> ' + relTargetPath});
        }
      });
      this.log.info.ok(page.path);
      return page;
    },

    "finish": function() {
      const tap = tapLogger(this.log);
      PageIndex.forEach(pageIndex, page => {
        if (page.inboundLinks.size === 0) {
          tap.test({description: 'orphaned: ' + page.path});
        } else {
          tap.test({ok: true, description: 'page is discoverable: ' + page.path});
        }
      });
    }
  }
};
