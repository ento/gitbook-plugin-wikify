'use strict';
const path = require('path');

class Directory {
  constructor (path) {
    this.path = path;
  }

  get indexPagePath() {
    return path.join(this.path, Directory.indexPageName);
  }

  get dirname() {
    return path.dirname(this.path);
  }

  get basename() {
    return path.basename(this.path);
  }
}

Directory.indexPageName = '_index.md';

module.exports = Directory;
