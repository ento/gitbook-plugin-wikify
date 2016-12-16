'use strict';
const path = require('path');
const Promise = require('bluebird');
const glob = Promise.promisify(require('glob'));

const DirectoryIndex = require('./directory_index');
const PageIndex = require('./page_index');
const Page = require('./page');
const open = require('./asyncfs').open;
const fs = require('./asyncfs').fs;


class Wiki {
  constructor (root, pageIndex, directoryIndex) {
    this.root = root;
    this.pageIndex = pageIndex;
    this.directoryIndex = directoryIndex;
  }

  static index(root, isFileIgnored) {
    const pageIndex = new PageIndex();
    const directoryIndex = new DirectoryIndex();
    const globOptions = {
      cwd: root,
      ignore: ['node_modules/**/*.md', 'SUMMARY.md', '_index.md', '**/_index.md']
    };

    return glob('**/*.md', globOptions)
      .then(files => {
        files.forEach(filepath => {
          if (typeof isFileIgnored === 'function' && isFileIgnored(filepath)) {
            return;
          }

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
      Object.keys(wiki.directoryIndex).map(function(dirPath) {
        const resolvedDir = path.join(wiki.root, dirPath),
              sourceIndexFile = path.join(resolvedDir, 'index.md'),
              generatedIndexFile = path.join(resolvedDir, '_index.md');
        return fs.accessAsync(sourceIndexFile, 'r')
          .then(() => {
            // copy index.md as-is if exists
            return fs.copyAsync(sourceIndexFile, generatedIndexFile);
          })
          .catch(() => {
            // autogenerate an index
            return Wiki.generateIndexPage(wiki, wiki.directoryIndex[dirPath], generatedIndexFile);
          });
      }))
      .then(() => {
        return wiki;
      });
  }

  /* generate dirname/_index.md for a specific directory */
  static generateIndexPage(wiki, forDirectory, resolvedIndexPath) {
    return Promise.using(open(resolvedIndexPath, 'w'), fd => {
        // title
        return fs.writeAsync(fd, '# ' + forDirectory.path + '\n')
          .then(() => {
            // directories
            return Array.from(forDirectory.dirs).sort().reduce(function(promise, basename) {
              return promise.then(() => {
                return fs.writeAsync(fd, '- [' + basename + '](./' + basename + '/_index.md)\n')
              });;
            }, Promise.resolve());
          })
          .then(() => {
            // pages
            return Array.from(forDirectory.pages).sort().reduce(function(promise, basename) {
              return promise.then(() => {
                return fs.writeAsync(fd, '- [' + basename + '](./' + basename + ')\n');
              });
            }, Promise.resolve());
          });
      })
      .then(() => {
        return wiki;
      });
  }

  /* generate SUMMARY.md */
  static generateSummaryPage(wiki) {
    return Promise.using(open(path.resolve(wiki.root, 'SUMMARY.md'), 'w'), fd => {
        const titlePromise = fs.writeAsync(fd, '# Index\n');
        return PageIndex.sortedInitials(wiki.pageIndex)
          .reduce((promise, initial) => {
            const initialPromise = promise.then(() => {
              return fs.writeAsync(fd, '\n### ' + initial + '\n');
            });
            return PageIndex.sortPagesAt(wiki.pageIndex, initial)
              .reduce((promise, page) => {
                return promise.then(() => {
                  return fs.writeAsync(fd, '- [' + page.title + '](' + page.path + ')\n');
                });
              }, initialPromise);
          }, titlePromise);
      })
      .then(() => {
        return wiki;
      });
  }
};

module.exports = Wiki;
