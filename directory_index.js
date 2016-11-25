'use strict';
const path = require("path");
const Directory = require("./directory");

module.exports = class DirectoryIndex {
  constructor () {
    // path: {path, pages: Set<basename>, dirs: Set<basename>}
  }

  static addPage(directoryIndex, page) {
    if (page.isRootPage) return;
    const pageDirname = page.dirname;

    DirectoryIndex.parents(page.path).forEach(dir => {
      if (dir.path === pageDirname) {
        DirectoryIndex.ensureDirectory(directoryIndex, dir.path);
        directoryIndex[dir.path].pages.add(page.basename);
      }
      if (dir.dirname !== '.') {
        DirectoryIndex.ensureDirectory(directoryIndex, dir.dirname);
        directoryIndex[dir.dirname].dirs.add(dir.basename);
      }
    });
  }

  static ensureDirectory(directoryIndex, directoryPath) {
    if (!directoryIndex.hasOwnProperty(directoryPath)) {
      directoryIndex[directoryPath] = {
        path: directoryPath,
        pages: new Set(),
        dirs: new Set()
      };
    }
  }

  static parents(pagePath) {
    // check for '/'
    if (path.basename(pagePath).length === 0) return [];
    // check for 'foo'
    if (path.dirname(pagePath) === '.') return [];
    const parts = path.dirname(pagePath).split(path.sep),
          parents = [];
    if (path.isAbsolute(pagePath)) {
      parts.shift();
    }
    parts.reduce((acc, part) => {
      if (part.length === 0) return acc;
      if (acc.length === 0) {
        if (path.isAbsolute(pagePath)) {
          acc.push(new Directory(path.join(path.sep, part)));
        } else {
          acc.push(new Directory(part));
        }
      } else {
        const lastParent = acc[parents.length - 1];
        acc.push(new Directory(path.join(lastParent.path, part)));
      }
      return acc;
    }, parents);
    return parents;
  }
};
