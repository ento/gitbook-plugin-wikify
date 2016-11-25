'use strict';
const path = require('path');

module.exports = class Page {
  constructor (path, title) {
    this.path = path; // relative to GitBook root
    this.title = title;
    this.inboundLinks = new Set();
  }

  get basename() {
    return path.basename(this.path);
  }

  get dirname() {
    return path.dirname(this.path);
  }

  get initial() {
    return path.basename(this.title).charAt(0).toUpperCase();
  }

  get isRootPage() {
    var dirname = path.dirname(this.path);
    return dirname === '.';
  }
}
