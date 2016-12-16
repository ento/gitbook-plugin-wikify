'use strict';

module.exports = class PageIndex {
  constructor () {
    this.byInitial = {}; // {initial: {path: Page}}
    this.byPath = {}; // {path: Page}
  }

  static addPage(pageIndex, page) {
    const initial = page.initial;
    const path = page.path;

    if (!pageIndex.byInitial.hasOwnProperty(initial)) {
      pageIndex.byInitial[initial] = {};
    }
    pageIndex.byInitial[initial][path] = page;

    if (!pageIndex.byPath.hasOwnProperty(path)) {
      pageIndex.byPath[path] = {};
    }
    pageIndex.byPath[path] = page;
  }

  static hasPath(pageIndex, path) {
    return pageIndex.byPath.hasOwnProperty(path);
  }

  static getByPath(pageIndex, path) {
    return pageIndex.byPath[path];
  }

  static forEach(pageIndex, fn) {
    Object.keys(pageIndex.byPath).sort().forEach(path => {
      fn(pageIndex.byPath[path]);
    });
  }

  static sortedInitials(pageIndex) {
    return Object.keys(pageIndex.byInitial).sort((a, b) => {
      var aIsNumber = !isNaN(a),
        bIsNumber = !isNaN(b);
      if (aIsNumber && !bIsNumber) {
        return 1;
      } else if (!aIsNumber && bIsNumber) {
        return -1;
      } else {
        return a.localeCompare(b);
      }
    });
  }

  static sortPagesAt(pageIndex, initial) {
    return PageIndex.sortPages(Object.keys(pageIndex.byInitial[initial]).map(path => {
      return pageIndex.byInitial[initial][path];
    }));
  }

  static sortPages(pages) {
    return pages.sort((a, b) => {
      return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
    });
  }
};
