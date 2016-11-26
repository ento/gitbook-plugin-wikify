'use strict';
const fs = require('fs');
const path = require('path');
const pify = require('pify');
const glob = require('glob');

const DirectoryIndex = require('./directory_index');
const PageIndex = require('./page_index');
const Page = require('./page');


module.exports = class Wiki {
  constructor (root, pageIndex, directoryIndex) {
    this.root = root;
    this.pageIndex = pageIndex;
    this.directoryIndex = directoryIndex;
  }

  static index(root) {
    const pageIndex = new PageIndex();
    const directoryIndex = new DirectoryIndex();
    const globOptions = {
      cwd: root,
      ignore: ['node_modules/**/*.md', 'SUMMARY.md', '_index.md', '**/_index.md']
    };

    return pify(glob)('**/*.md', globOptions)
      .then(files => {
        files.forEach(filepath => {
          const page = new Page(filepath, filepath);

          PageIndex.addPage(pageIndex, page);
          DirectoryIndex.addPage(directoryIndex, page);
          DirectoryIndex.parents(page.path).forEach(function(dir) {
            PageIndex.addPage(pageIndex, new Page(dir.indexPagePath, dir.path));
          });
        });
        return new Wiki(root, pageIndex, directoryIndex);
    });
  }

  /* generate dirname/_index.md for all known directories */
  static generateIndexPages(wiki) {
    return Promise.all(
      Object.values(wiki.directoryIndex).map(function(dir) {
        const resolvedDir = path.join(wiki.root, dir.path),
              sourceIndexFile = path.join(resolvedDir, 'index.md'),
              generatedIndexFile = path.join(resolvedDir, '_index.md');
        return pify(fs.access)(sourceIndexFile, 'r')
          .then(() => {
            // copy index.md as-is if exists
            return pify(fs.copy)(sourceIndexFile, generatedIndexFile);
          })
          .catch(() => {
            // autogenerate an index
            return Wiki.generateIndexPage(wiki, dir, generatedIndexFile);
          });
      }))
      .then(() => {
        return wiki;
      });
  }

  /* generate dirname/_index.md for a specific directory */
  static generateIndexPage(wiki, forDirectory, resolvedIndexPath) {
    return pify(fs.open)(resolvedIndexPath, 'w')
      .then(fd => {
        // title
        return pify(fs.write)(fd, '# ' + forDirectory.path + '\n')
          .then(() => {
            // directories
            return Array.from(forDirectory.dirs).sort().reduce(function(promise, basename) {
              return promise.then(() => {
                return pify(fs.write)(fd, '- [' + basename + '](./' + basename + '/_index.md)\n')
              });;
            }, Promise.resolve());
          })
          .then(() => {
            // pages
            return Array.from(forDirectory.pages).sort().reduce(function(promise, basename) {
              return promise.then(() => {
                return pify(fs.write)(fd, '- [' + basename + '](./' + basename + ')\n');
              });
            }, Promise.resolve());
          })
      });
  }

  /* generate SUMMARY.md */
  static generateSummaryPage(wiki) {
    return pify(fs.open)(path.join(wiki.root, 'SUMMARY.md'), 'w')
      .then(fd => {
        const titlePromise = pify(fs.write)(fd, '# Index\n');
        return PageIndex.sortedInitials(wiki.pageIndex)
          .reduce((promise, initial) => {
            const initialPromise = promise.then(() => {
              return pify(fs.write)(fd, '\n### ' + initial + '\n');
            });
            return PageIndex.sortPagesAt(wiki.pageIndex, initial)
              .reduce((promise, page) => {
                return promise.then(() => {
                  return pify(fs.write)(fd, '- [' + page.title + '](' + page.path + ')\n');
                });
              }, initialPromise);
          }, titlePromise);
      });
  }
};
