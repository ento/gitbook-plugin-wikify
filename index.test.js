import test from 'ava';
import fs from 'fs-extra';
import uniqueTempDir from 'unique-temp-dir';
import {execFile} from 'child_process';
import pify from 'pify';

const touch = (path) => {
  fs.closeSync(fs.openSync(path, 'w'));
};

test.only('cli: creates summary page', async t => {
  const root = uniqueTempDir({create: true, thunk: true});
  const outputs = await pify(execFile, {multiArgs: true})('./bin/gitbook-autoindex.js', [root(), '--debug']);
  t.truthy(fs.existsSync(root('SUMMARY.md')), outputs);
});

test.todo('cli: creates summary page under a non-cwd root');
test.todo('cli: creates index pages');
test.todo('page: creates breadcrumbs');
test.todo('page: creates breadcrumbs for a non-cwd root');
test.todo('page: replaces link to a directory with a link to its index page');
test.todo('page: reports page as ok if no broken link');
test.todo('page: reports broken link');
test.todo('page: ignores empty link');
test.todo('page: ignores external link');
test.todo('page: ignores in-page link');
test.todo('finish: reports orphaned pages');
test.todo('finish: reports orphaned directory');
test.todo('finish: reports ok if no orphan');
