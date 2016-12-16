import test from 'ava';
import Promise from 'bluebird';
import fs from 'fs-extra';
import uniqueTempDir from 'unique-temp-dir';
import path from 'path';
import tester from 'gitbook-tester';
import TapParser from 'tap-parser'
import winston from 'winston';
import 'winston-memory';

Promise.promisifyAll(fs);

const open = function() {
  return fs.openAsync.apply(fs, arguments).disposer(fd => {
    return fs.closeAsync(fd)
      .catch(() => {});
  });
}

const memoryLogger = () => {
  return new (winston.Logger)({
    level: 'info',
    transports: [new winston.transports.Memory()]
  });
}

const checkTapResult = (logger, cb) => {
  const tapParser = TapParser(cb);
  logger.transports.memory.writeOutput.forEach(line => {
    tapParser.write(line.substring("info: ".length));
    tapParser.write("\n");
  })
  tapParser.end();
}

const builder = () => {
  return tester.builder()
    .withLocalPlugin(path.join(__dirname, '..'))
}

/* breadcrumbs */

test("page: doesn't create breadcrumbs for readme", async t => {
  const result = await builder()
        .withContent('Intro')
        .create();
  t.is(result.get('index.html').$('nav.wiki-breadcrumbs').length, 0);
});

test('page: creates breadcrumbs for a root page', async t => {
  const result = await builder()
        .withContent('Intro')
        .withPage('hello', 'world')
        .create();
  const $crumbs = result.get('hello.html').$('nav.wiki-breadcrumbs');
  t.is($crumbs.length, 1);
  t.is($crumbs.find('a').length, 1);
  t.is($crumbs.find('a').eq(0).attr('href'), './');
  t.is($crumbs.find('.wiki-breadcrumbs-static').length, 1);
  t.is($crumbs.find('.wiki-breadcrumbs-static').eq(0).text(), 'hello.md');
});

test('page: creates breadcrumbs in a sub page', async t => {
  const result = await builder()
        .withContent('Intro')
        .withPage('a/hello', 'world')
        .beforeBuild(path.join(__dirname, 'bin', 'gitbook-autoindex.js'), ['.'])
        .create();
  const $crumbs = result.get('a/hello.html').$('nav.wiki-breadcrumbs');
  t.is($crumbs.length, 1);
  t.is($crumbs.find('a').length, 2);
  t.is($crumbs.find('a').eq(0).attr('href'), '../');
  t.is($crumbs.find('a').eq(1).attr('href'), '_index.html');
  t.is($crumbs.find('.wiki-breadcrumbs-static').length, 1);
  t.is($crumbs.find('.wiki-breadcrumbs-static').eq(0).text(), 'hello.md');
});

test('page: creates breadcrumb pointing at readme in a non-cwd root', async t => {
  const result = await builder()
        .withContent('Intro')
        .withPage('a/hello', 'world')
        .withBookJson({root: 'book'})
        .beforeBuild(path.join(__dirname, 'bin', 'gitbook-autoindex.js'), ['.'])
        .create();
  const $crumbs = result.get('a/hello.html').$('nav.wiki-breadcrumbs');
  t.is($crumbs.length, 1);
  t.is($crumbs.find('a').length, 2);
  t.is($crumbs.find('a').eq(0).attr('href'), '../');
  t.is($crumbs.find('a').eq(1).attr('href'), '_index.html');
  t.is($crumbs.find('.wiki-breadcrumbs-static').length, 1);
  t.is($crumbs.find('.wiki-breadcrumbs-static').eq(0).text(), 'hello.md');
});

/* directory links */

test('page: replaces links to directories with a link to its index page', async t => {
  const result = await builder()
        .withContent('[a](a)')
        .withPage('a/hello', '[world](.)')
        .withBookJson({root: 'book'})
        .beforeBuild(path.join(__dirname, 'bin', 'gitbook-autoindex.js'), ['.'])
        .create();
  t.is(result.get('index.html').$('a').attr('href'),
       'a/_index.html');
  t.is(result.get('a/hello.html').$('a:not(.wiki-breadcrumbs-link)').attr('href'),
       '_index.html');
});

/* linkchecker */

test('page/finish: reports as ok if no broken link and no orphan', async t => {
  const logger = memoryLogger();
  const tempDir = uniqueTempDir({create: true, thunk: true});
  const lintOutputPath = tempDir('wikilint.xml');
  const result = await builder()
        .withContent('[a](a)')
        .withPage('a/hello', '[world](.)')
        .withBookJson({'pluginsConfig': {'gen-all': {'lintOutput': lintOutputPath}}})
        .withLogger(logger)
        .beforeBuild(path.join(__dirname, 'bin', 'gitbook-autoindex.js'), ['.'])
        .create()
        .then(() => {
          checkTapResult(logger, (result) => {
            t.is(result.pass, 3);
            t.is(result.fail, 0);
          });
          return fs.readFileAsync(lintOutputPath, 'utf-8');
        });
  t.notRegex(result, /file/);
});

test('page: reports broken link', async t => {
  const logger = memoryLogger();
  const tempDir = uniqueTempDir({create: true, thunk: true});
  const lintOutputPath = tempDir('wikilint.xml');
  const result = await builder()
        .withContent('[a](a)')
        .withPage('a/hello', '[world](world.md)')
        .withBookJson({'pluginsConfig': {'gen-all': {'lintOutput': lintOutputPath}}})
        .withLogger(logger)
        .beforeBuild(path.join(__dirname, 'bin', 'gitbook-autoindex.js'), ['.'])
        .create()
        .then(() => {
          checkTapResult(logger, (result) => {
            t.is(result.pass, 2);
            t.is(result.fail, 1);
          });
          return fs.readFileAsync(lintOutputPath, 'utf-8');
        });
  t.notRegex(result, /file/);
});

test('finish: reports an orphaned page', async t => {
  const logger = memoryLogger();
  const tempDir = uniqueTempDir({create: true, thunk: true});
  const lintOutputPath = tempDir('wikilint.xml');
  const result = await builder()
        .withContent('')
        .withPage('hello', 'world')
        .withBookJson({'pluginsConfig': {'gen-all': {'lintOutput': lintOutputPath}}})
        .withLogger(logger)
        .beforeBuild(path.join(__dirname, 'bin', 'gitbook-autoindex.js'), ['.'])
        .create()
        .then(() => {
          checkTapResult(logger, (result) => {
            t.is(result.pass, 2);
            t.is(result.fail, 0);
          });
          return fs.readFileAsync(lintOutputPath, 'utf-8');
        });
  t.regex(result, /hello\.md/);
});

test('finish: reports an orphaned directory index even with a child page', async t => {
  const logger = memoryLogger();
  const tempDir = uniqueTempDir({create: true, thunk: true});
  const lintOutputPath = tempDir('wikilint.xml');
  const result = await builder()
        .withContent('')
        .withPage('a/hello', 'world')
        .withBookJson({'pluginsConfig': {'gen-all': {'lintOutput': lintOutputPath}}})
        .withLogger(logger)
        .beforeBuild(path.join(__dirname, 'bin', 'gitbook-autoindex.js'), ['.'])
        .create()
        .then(() => {
          checkTapResult(logger, (result) => {
            t.is(result.pass, 3);
            t.is(result.fail, 0);
          });
          return fs.readFileAsync(lintOutputPath, 'utf-8');
        });
  t.regex(result, /a\/_index\.md/);
});
