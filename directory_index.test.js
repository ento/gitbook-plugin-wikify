import test from 'ava';
import DirectoryIndex from './directory_index';
import Directory from './directory';


test('parents of /', t => {
  t.deepEqual(DirectoryIndex.parents('/'), []);
});

test('parents of /foo', t => {
  t.deepEqual(DirectoryIndex.parents('/foo'), []);
});

test('parents of /foo/bar', t => {
  t.deepEqual(DirectoryIndex.parents('/foo/bar'), [
    new Directory('/foo')
  ]);
});

test('parents of /foo/bar/baz', t => {
  t.deepEqual(DirectoryIndex.parents('/foo/bar/baz'), [
    new Directory('/foo'),
    new Directory('/foo/bar')
  ]);
});

test('parents of ./foo', t => {
  t.deepEqual(DirectoryIndex.parents('./foo'), []);
});

test('parents of foo', t => {
  t.deepEqual(DirectoryIndex.parents('foo'), []);
});

test('parents of foo/bar', t => {
  t.deepEqual(DirectoryIndex.parents('foo/bar'), [
    new Directory('foo')
  ]);
});

test('parents of foo/bar/baz', t => {
  t.deepEqual(DirectoryIndex.parents('foo/bar/baz'), [
    new Directory('foo'),
    new Directory('foo/bar')
  ]);
});
