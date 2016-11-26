#! /usr/bin/env node
'use strict';

const _ = require('lodash');
const yargs = require('yargs');
const color = require('bash-color');

const manager = require('gitbook-cli/lib');
const commands = require('gitbook-cli/lib/commands');
const autoindex = require('../autoindex');

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
  const bookRoot = argv._[0] || process.cwd();
  const args = argv._.slice(0);
  const kwargs = _.omit(argv, '$0', '_');

  runPromise(
    manager
      .ensureAndLoad(bookRoot, argv.gitbook)
      .then((gitbook) => {
        const logLevel = kwargs.log;
        const fs = gitbook.createNodeFS(bookRoot);
        const book = gitbook.Book.createForFS(fs);
        book.setLogLevel(logLevel);

        return autoindex(book.getContentRoot());
      })
  );
}

// Init gitbook-cli
manager.init();

yargs
  .usage('Usage: $0 [book-root] [options]')
  .alias('v', 'gitbook')
  .nargs('gitbook', 10)
  .describe('gitbook', 'specify GitBook version to use')
  .alias('d', 'debug')
  .boolean('debug')
  .describe('debug', 'enable verbose error')
  .help('h')
  .alias('h', 'help');

main(yargs.argv);