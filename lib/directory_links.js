'use strict';
const path = require('path');
const url = require('url');
const cheerio = require('cheerio');
const Promise = require('bluebird');
const glob = Promise.promisify(require('glob'));
const Directory = require('./directory');


class DirectoryLinks {
  static collectIndexPages(contentRoot) {
    // type: String -> Promise<Set>
    const globOptions = {
      cwd: contentRoot,
      ignore: ['node_modules/**/*.md']
    };
    return glob('**/_index.md', globOptions)
      .then(files => {
        return new Set(files);
      });
  }

  static rewrite(locationUtils, pages, page) {
    const currentDirectory = path.dirname(page.path);
    const $ = cheerio.load(page.content);
    $('a').each(function(i, el) {
      DirectoryLinks.rewriteLink(locationUtils, pages, currentDirectory, cheerio(el));
    });
    page.content = $.html();
    return page;
  }

  static rewriteLink(locationUtils, pages, currentDirectory, $a) {
    let href = $a.attr('href');

    if (!href) {
      return;
    }

    if (locationUtils.isExternal(href)) {
      return;
    }

    const parsed = url.parse(href);
    href = parsed.pathname || '';

    if (href) {
      href = locationUtils.toAbsolute(href, currentDirectory, '.');

      if (href === '.') {
        return;
      }

      const indexPath = path.join(href, Directory.indexPageName);

      if (pages.has(indexPath)) {
        href = indexPath;
      }

      href = locationUtils.relative(currentDirectory, href);
    }

    href = href + (parsed.hash || '');

    $a.attr('href', href);
  }
}

module.exports = DirectoryLinks;
