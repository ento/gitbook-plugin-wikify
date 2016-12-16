#! /usr/bin/env node
'use strict';

const path = require('path');
const _ = require('lodash');
const yargs = require('yargs');
const color = require('bash-color');

const manager = require('gitbook-cli/lib');
const commands = require('gitbook-cli/lib/commands');
const autoindex = require('../lib/autoindex');

const runPromise = (p) => {
  return p
    .then(() => {
      process.exit(0);
    }, (err) => {
      console.log('');
      console.log(color.red(err.toString()));
      if (program.debug || process.env.DEBUG) console.log(err.stack || '');
      process.exit(1);
    });
}

const main = (argv) => {
  const bookRoot = path.resolve(argv._[0] || process.cwd());
  const kwargs = _.omit(argv, '$0', '_');

  runPromise(
    manager
      .ensureAndLoad(bookRoot, argv.gitbook)
      .then((gitbook) => {
        const logLevel = kwargs.log;
        const fs = gitbook.createNodeFS(bookRoot);
        const book = gitbook.Book.createForFS(fs);
        book.setLogLevel(logLevel);

        return gitbook.Parse.parseIgnore(book)
          .then(gitbook.Parse.parseConfig)
          .then(book => {
            return autoindex(book.getContentRoot(), book.isFileIgnored.bind(book));
          });
      })
  );
}

// Init gitbook-cli
manager.init();

yargs
  .usage('Usage: $0 [book-root] [options]')
  .alias('v', 'gitbook')
  .nargs('gitbook', 1)
  .describe('gitbook', 'specify GitBook version to use')
  .alias('d', 'debug')
  .boolean('debug')
  .describe('debug', 'enable verbose error')
  .help('h')
  .alias('h', 'help');

main(yargs.argv);
