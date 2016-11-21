var glob = require('glob');
var fs = require('fs-extra');
var path = require('path');
var url = require('url');
var Immutable = require('immutable');
var cheerio = require('cheerio');


var Page = Immutable.Record({
  path: String(),
  basename: String(),
  title: String(),
  inboundLinks: Immutable.Set()
});

Page.prototype.getBasename = function() {
  return path.basename(this.get('path'));
}

Page.prototype.getDirname = function() {
  return path.dirname(this.get('path'));
}

Page.prototype.getInitial = function() {
  return path.basename(this.get('title')).charAt(0).toUpperCase();
}

Page.prototype.getPath = function() {
  return this.get('path');
}

Page.prototype.getTitle = function() {
  return this.get('title');
}

Page.prototype.isRootPage = function() {
  var dirname = path.dirname(this.getPath());
  return dirname === '.';
}

var PageIndex = {};
PageIndex.addPage = function(indexGroups, page) {
  var initial = page.getInitial()
  if (!indexGroups.hasOwnProperty(initial)) {
    indexGroups[initial] = {};
  }
  indexGroups[initial][page.getPath()] = page;
};

PageIndex.allPages = function(indexGroups) {
  var pages = {};
  Object.values(indexGroups).forEach(function(groupPages) {
    Object.values(groupPages).forEach(function(page) {
      pages[page.getPath()] = page;
    });
  });
  return pages;
}

PageIndex.sortedInitials = function(indexGroups) {
  return Object.keys(indexGroups).sort(function(a, b) {
    var aIsNumber = !isNaN(a),
        bIsNumber = !isNaN(b);
    if (aIsNumber && !bIsNumber) {
      return 1;
    } else if (!aIsNumber && bIsNumber) {
      return -1
    } else {
      return a.localeCompare(b);
    }
  });
};

PageIndex.sortPagesAt = function(indexGroups, initial) {
  return PageIndex.sortPages(Object.values(indexGroups[initial]));
};

PageIndex.sortPages = function(pages) {
  return pages.sort(function(a, b) {
    return a.getTitle().toLowerCase().localeCompare(b.getTitle().toLowerCase());
  });
};

var DirectoryIndex = {};
DirectoryIndex.addPage = function(directoryGroups, page) {
  if (page.isRootPage()) return;
  var pageDirname = page.getDirname();

  DirectoryIndex.pardirs(page).forEach(function(dir) {
    if (!directoryGroups.hasOwnProperty(dir.pardir)) {
      directoryGroups[dir.pardir] = {pages: [], dirs: {}};
    }
    if (dir.pardir === pageDirname) {
      directoryGroups[dir.pardir].pages.push(page);
    } else {
      directoryGroups[dir.pardir].dirs[dir.subdir] = {
        subdir: dir.subdir,
        index: path.join(dir.subdir, '_index.md')
      };
    }
  });
};

DirectoryIndex.pardirs = function(page) {
  if (page.isRootPage()) return [];
  var dirname = page.getDirname(),
      parparts = dirname.split(path.sep),
      pardirs = [];
  for (var i = parparts.length + 1; i--; i > 0) {
    var pardir = parparts.slice(0, i).join(path.sep),
        subdir = parparts[i];
    pardirs.push({
      pardir: pardir,
      subdir: subdir
    });
  }
  return pardirs;
};

DirectoryIndex.indexPagesFor = function(page) {
  return DirectoryIndex.pardirs(page).map(function(dir) {
    return new Page({
      path: path.join(dir.pardir, '_index.md'),
      title: dir.pardir
    })
  })
};

var pagesStore;

// TODO: need to generate summary before gitbook build
module.exports = {
  // Map of hooks
  hooks: {
    config: function(config) {
      var indexGroups = {}, // initial: {path: Page}
          directoryGroups = {}, // dir: {pages: [], dirs: {subdir: dir}}
          root = '.';

      if (config.root) {
        root = config.root;
      }

      var globOptions = {
        cwd: root,
        ignore: ['node_modules/**/*.md', 'SUMMARY.md', '_index.md', '**/_index.md']
      };
      glob.sync('**/*.md', globOptions).map(function(filepath) {
        var dirname = path.dirname(filepath),
            page = new Page({
              path: filepath,
              title: filepath
            });

        PageIndex.addPage(indexGroups, page);
        DirectoryIndex.addPage(directoryGroups, page);
        DirectoryIndex.indexPagesFor(page).forEach(function(indexPage) {
          PageIndex.addPage(indexGroups, indexPage);
        });
      });

      /* generate dirname/_index.md */

      Object.keys(directoryGroups).forEach(function(dir) {
        var resolvedDir = path.join(root, dir),
            sourceIndexFile = path.join(resolvedDir, 'index.md'),
            generatedIndexFile = path.join(resolvedDir, '_index.md');
        if (fs.existsSync(sourceIndexFile)) {
          // copy index.md as-is if exists
          fs.copySync(sourceIndexFile, generatedIndexFile);
        } else {
          // autogenerate an index
          var fd = fs.openSync(generatedIndexFile, 'w');
          try {
            // title
            fs.writeSync(fd, '# ' + dir + '\n');
            // directories
            Object.keys(directoryGroups[dir].dirs).sort().forEach(function(key) {
              var subdir = directoryGroups[dir].dirs[key];
              fs.writeSync(fd, '- [' + subdir.subdir + '](' + subdir.index + ')\n');
            });
            // pages
            PageIndex.sortPages(directoryGroups[dir].pages).forEach(function(page) {
              var basename = page.getBasename();
              fs.writeSync(fd, '- [' + basename + '](./' + basename + ')\n');
            });
          } finally {
            fs.closeSync(fd);
          }
        }
      });

      /* generate SUMMARY.md */
      var fd = fs.openSync('SUMMARY.md', 'w');
      try {
        fs.writeSync(fd, '# Index\n');
        PageIndex.sortedInitials(indexGroups)
          .forEach(function(initial) {
            fs.writeSync(fd, '\n### ' + initial + '\n');
            PageIndex.sortPagesAt(indexGroups, initial)
              .forEach(function(page) {
                fs.writeSync(fd, '- [' + page.getTitle() + '](' + page.getPath() + ')\n');
              });
          });
      } finally {
        fs.closeSync(fd);
      }
      pagesStore = PageIndex.allPages(indexGroups);
      return config;
    },
    "page:before": function(page) {
      // don't generate breadcrumbs for readme
      if (page.path === this.config.get('structure.readme')) {
        return page;
      }
      // generated breadcrumbs
      var crumbs = [{
        path: this.config.get('structure.readme'),
        title: 'Top'
      }];
      var dirs = page.path.split(path.sep);
      var isIndex = path.basename(page.path) === '_index.md';
      var leaf = dirs.pop();
      if (isIndex) {
        // pop twice to account for _index.md
        leaf = dirs.pop();
      }
      dirs.forEach(function(dir, i) {
        if (dir === '.') return;
        crumbs.push({
          path: path.join(dirs.slice(0, i + 1).join(path.sep), '_index.md'),
          title: dir
        })
      });
      var links = crumbs.map(function(crumb) {
        return '[' + crumb.title + '](/' + crumb.path + ')';
      });
      if (isIndex) {
        links.push(leaf);
      } else {
        links.push(path.basename(page.path));
      }
      var crumbline = links.join(' > ');
      page.content = crumbline + '\n\n' + page.content;
      return page;
    },
    "page": function(page) {
      var absReadmePath = path.resolve('/', this.config.get('structure.readme'));
      // for each link, add to target's inboundLinks
      // if target is not found, add to broken links
      var $ = cheerio.load(page.content);
        if (page.path === 'checklists/_index.md') {
          console.log('checklists/_index.md')
        }
      $('a').each(function(i, el) {
        var href = $(el).attr('href');
        if (typeof href === 'undefined') return; //some empty link

        var target = url.parse(href);
        if (target.host !== null) return; // external link
        if (target.path === null) return; // probably just fragment

        var absTargetPath = path.resolve('/', path.dirname(page.path), target.path);
        if (absTargetPath === absReadmePath) return; // readme

        var relTargetPath = absTargetPath.substring(1);
        var maybeIndexPath = path.join(relTargetPath, '_index.md');

        if (page.path === 'checklists/_index.md') {
          console.log(relTargetPath)
        }
        var pageJson = null;
        if (pagesStore.hasOwnProperty(maybeIndexPath)) {
          targetPage = pagesStore[maybeIndexPath];
        } else if (pagesStore.hasOwnProperty(relTargetPath)) {
          targetPage = pagesStore[relTargetPath];
        } else {
          console.log('WARN', 'broken link in', page.path, relTargetPath);
        }
        if (targetPage !== null) {
          pagesStore[relTargetPath] = targetPage.set('inboundLinks', targetPage.inboundLinks.add(page.path));
        }
      });
      console.log(page.path);
      return page;
    },
    "finish": function() {
      Object.keys(pagesStore).sort().forEach(function(path) {
        var page = pagesStore[path];
        if (page.inboundLinks.size === 0) {
          if (path.basename(page.path) === '_index.md') {
            console.log('WARN', 'orphaned directory', path.dirname(page.path));
          } else {
            console.log('WARN', 'orphaned page', page.path);
          }
        }
      });
    }
  },

  // Map of new blocks
  blocks: {},

  // Map of new filters
  filters: {}
};
