'use strict';
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));

const open = function() {
  return fs.openAsync.apply(fs, arguments).disposer(fd => {
    return fs.closeAsync(fd)
      .catch(() => {});
  });
};

module.exports = {open: open, fs: fs};
