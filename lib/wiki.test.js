import test from 'ava';
import fs from 'fs-extra';
import path from 'path';
import uniqueTempDir from 'unique-temp-dir';

import Wiki from './wiki';
import Page from './page';

//  Don't use the Promise introduced by babel-runtime. https://github.com/avajs/ava/issues/947
const { Set } = global;

const touch = (path) => {
  fs.closeSync(fs.openSync(path, 'w'));
};

const isEmpty = (t, wiki) => {
  t.is(Object.keys(wiki.pageIndex.byPath).length, 0);
  t.is(Object.keys(wiki.pageIndex.byInitial).length, 0);
  t.is(Object.keys(wiki.directoryIndex).length, 0);
};


test('.index ignores _index.md', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  touch(root('_index.md'));
  const wiki = await Wiki.index(root());
  isEmpty(t, wiki);
});

test('.index ignores node_modules', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  fs.ensureDirSync(root('node_modules'));
  touch(root('node_modules/hello.md'));
  const wiki = await Wiki.index(root());
  isEmpty(t, wiki);
});

test('.index ignores SUMMARY.md', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  touch(root('SUMMARY.md'));
  const wiki = await Wiki.index(root());
  isEmpty(t, wiki);
});

test('.index ignores based on isFileIgnored', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  touch(root('hello.md'));
  const wiki = await Wiki.index(root(), filename => {
    return true;
  });
  isEmpty(t, wiki);
});

test('.index adds root pages', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  touch(root('hello.md'));
  touch(root('world.md'));
  const wiki = await Wiki.index(root());
  t.is(Object.keys(wiki.pageIndex.byPath).length, 2);
  t.is(Object.keys(wiki.pageIndex.byInitial).length, 2);
  t.deepEqual(wiki.pageIndex.byPath['hello.md'], new Page('hello.md', 'hello.md'));
  t.deepEqual(wiki.pageIndex.byInitial['H']['hello.md'], new Page('hello.md', 'hello.md'));
  t.deepEqual(wiki.pageIndex.byPath['world.md'], new Page('world.md', 'world.md'));
  t.deepEqual(wiki.pageIndex.byInitial['W']['world.md'], new Page('world.md', 'world.md'));
  t.is(Object.keys(wiki.directoryIndex).length, 0);
});

test('.index adds directory pages and directories', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  fs.ensureDirSync(root('a/b'));
  fs.ensureDirSync(root('c/b'));
  touch(root('a/hello.md'));
  touch(root('a/b/world.md'));
  touch(root('c/b/bye.md'));

  const wiki = await Wiki.index(root());
  const numPages = 3,
        numDirectories = 4,
        numTopLevelDirectories = 2;

  t.is(Object.keys(wiki.pageIndex.byPath).length, numPages + numDirectories);
  t.is(Object.keys(wiki.pageIndex.byInitial).length, numPages + numTopLevelDirectories);
  t.deepEqual(wiki.pageIndex.byPath['a/hello.md'], new Page('a/hello.md', 'a/hello.md'));
  t.deepEqual(wiki.pageIndex.byInitial['H']['a/hello.md'], new Page('a/hello.md', 'a/hello.md'));
  t.deepEqual(wiki.pageIndex.byPath['a/b/world.md'], new Page('a/b/world.md', 'a/b/world.md'));
  t.deepEqual(wiki.pageIndex.byInitial['W']['a/b/world.md'], new Page('a/b/world.md', 'a/b/world.md'));
  t.deepEqual(wiki.pageIndex.byPath['c/b/bye.md'], new Page('c/b/bye.md', 'c/b/bye.md'));
  t.deepEqual(wiki.pageIndex.byInitial['B']['c/b/bye.md'], new Page('c/b/bye.md', 'c/b/bye.md'));

  t.is(Object.keys(wiki.directoryIndex).length, numDirectories);
  t.deepEqual(wiki.directoryIndex['a'], {path: 'a', pages: new Set(['hello.md']), dirs: new Set(['b'])});
  t.deepEqual(wiki.directoryIndex['a/b'], {path: 'a/b', pages: new Set(['world.md']), dirs: new Set()});
  t.deepEqual(wiki.directoryIndex['c'], {path: 'c', pages: new Set(), dirs: new Set(['b'])});
  t.deepEqual(wiki.directoryIndex['c/b'], {path: 'c/b', pages: new Set(['bye.md']), dirs: new Set()});
});

test('.generateIndexPages copies index.md if exists in a directory', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  fs.ensureDirSync(root('a/b'));
  touch(root('index.md'));
  touch(root('a/index.md'));
  touch(root('a/b/index.md'));
  const wiki = await Wiki.index(root())
          .then(wiki => {
            return Wiki.generateIndexPages(wiki);
          });
  t.truthy(fs.existsSync(root('a/_index.md')));
  t.truthy(fs.existsSync(root('a/b/_index.md')));
});

test('.generateIndexPages lists subdirectories', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  fs.ensureDirSync(root('a/foo'));
  fs.ensureDirSync(root('a/bar'));
  fs.ensureDirSync(root('a/empty'));
  touch(root('a/foo/foo.md'));
  touch(root('a/bar/bar.md'));
  const wiki = await Wiki.index(root())
          .then(wiki => {
            return Wiki.generateIndexPages(wiki);
          });
  t.truthy(fs.existsSync(root('a/_index.md')));
  const aIndex = fs.readFileSync(root('a/_index.md'), 'utf-8');
  t.regex(aIndex, /\[foo\]\(\.\/foo\/_index.md\)/);
  t.regex(aIndex, /\[bar\]\(\.\/bar\/_index.md\)/);
});

test('.generateIndexPages lists subpages', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  fs.ensureDirSync(root('a'));
  touch(root('a/foo.md'));
  touch(root('a/bar.md'));
  const wiki = await Wiki.index(root())
          .then(wiki => {
            return Wiki.generateIndexPages(wiki);
          });
  t.truthy(fs.existsSync(root('a/_index.md')));
  const aIndex = fs.readFileSync(root('a/_index.md'), 'utf-8');
  t.regex(aIndex, /\[foo.md\]\(\.\/foo\.md\)/);
  t.regex(aIndex, /\[bar.md\]\(\.\/bar\.md\)/);
});

test('.generateSummaryPage lists initials', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  fs.ensureDirSync(root('a'));
  touch(root('foo.md'));
  touch(root('a/bar.md'));
  const wiki = await Wiki.index(root())
          .then(wiki => {
            return Wiki.generateSummaryPage(wiki);
          });
  t.truthy(fs.existsSync(root('SUMMARY.md')));
  const summary = fs.readFileSync(root('SUMMARY.md'), 'utf-8');
  t.regex(summary, /### F/);
  t.regex(summary, /### B/);
});

test('.generateSummaryPage lists pages', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  fs.ensureDirSync(root('a'));
  touch(root('foo.md'));
  touch(root('a/bar.md'));
  const wiki = await Wiki.index(root())
          .then(wiki => {
            return Wiki.generateSummaryPage(wiki);
          });
  t.truthy(fs.existsSync(root('SUMMARY.md')));
  const summary = fs.readFileSync(root('SUMMARY.md'), 'utf-8');
  t.regex(summary, /\[foo\.md\]\(foo\.md\)/);
  t.regex(summary, /\[a\/bar\.md\]\(a\/bar\.md\)/);
});

test('.generateSummaryPage lists directories', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  fs.ensureDirSync(root('a/b'));
  touch(root('foo.md'));
  touch(root('a/bar.md'));
  touch(root('a/b/baz.md'));
  const wiki = await Wiki.index(root())
          .then(wiki => {
            return Wiki.generateSummaryPage(wiki);
          });
  t.truthy(fs.existsSync(root('SUMMARY.md')));
  const summary = fs.readFileSync(root('SUMMARY.md'), 'utf-8');
  t.regex(summary, /\[a\]\(a\/_index\.md\)/);
  t.regex(summary, /\[a\/b\]\(a\/b\/_index\.md\)/);
});
