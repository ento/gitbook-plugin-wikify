'use strict';
const path = require('path');
const gitbookLocal = require('gitbook-cli/lib/local');

function loadLocationUtils(gitbookVersion) {
  return gitbookLocal.resolve(gitbookVersion)
    .then(resolved => {
      return require(path.join(resolved.path, 'lib', 'utils', 'location'));
    });
}

module.exports = loadLocationUtils;
