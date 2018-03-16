import test from 'ava';
import cheerio from 'cheerio';
import DirectoryLinks from './directory_links';
import loadLocationUtils from './load_location_utils';

const locationUtilsPromise = loadLocationUtils(process.env.GITBOOK_VERSION || '*');

const rewrite = (pages, page) => {
  return locationUtilsPromise
    .then(utils => {
      return DirectoryLinks.rewrite(utils, pages, page);
    })
    .then(page => {
      return cheerio.load(page.content);
    });
};

test('.rewrite relative sub directory to README.md', async t => {
  const pages = new Set(['a/README.md']);
  const page = {
    path: 'hello.md',
    content: '<a href="a">world</a>'
  };
  const $ = await rewrite(pages, page);
  t.is($('a').attr('href'), 'a/README.md');
});

test('.rewrite absolute sub directory to README.md', async t => {
  const pages = new Set(['a/README.md']);
  const page = {
    path: 'hello.md',
    content: '<a href="/a">world</a>'
  };
  const $ = await rewrite(pages, page);
  t.is($('a').attr('href'), 'a/README.md');
});

test('.rewrite relative parent directory to README.md', async t => {
  const pages = new Set(['a/README.md']);
  const page = {
    path: 'a/hello.md',
    content: '<a href="../a">world</a>'
  };
  const $ = await rewrite(pages, page);
  t.is($('a').attr('href'), 'README.md');
});

test('.rewrite relative self directory to README.md', async t => {
  const pages = new Set(['a/README.md']);
  const page = {
    path: 'a/hello.md',
    content: '<a href=".">world</a>'
  };
  const $ = await rewrite(pages, page);
  t.is($('a').attr('href'), 'README.md');
});

test('.rewrite preserves fragment', async t => {
  const pages = new Set(['a/README.md']);
  const page = {
    path: 'hello.md',
    content: '<a href="a#readme">world</a>'
  };
  const $ = await rewrite(pages, page);
  t.is($('a').attr('href'), 'a/README.md#readme');
});

test('.rewrite doesn\'t touch empty link', async t => {
  const pages = new Set(['a/README.md']);
  const page = {
    path: 'hello.md',
    content: '<a href="">world</a>'
  };
  const $ = await rewrite(pages, page);
  t.is($('a').attr('href'), '');
});

test('.rewrite doesn\'t touch external links', async t => {
  const pages = new Set(['a/README.md']);
  const page = {
    path: 'hello.md',
    content: '<a href="http://www.example.com/a">world</a>'
  };
  const $ = await rewrite(pages, page);
  t.is($('a').attr('href'), 'http://www.example.com/a');
});

test('.rewrite doesn\'t touch root directory', async t => {
  const pages = new Set(['README.md']);
  const page = {
    path: 'hello.md',
    content: '<a href="/">world</a>'
  };
  const $ = await rewrite(pages, page);
  t.is($('a').attr('href'), '/');
});

test('.rewrite doesn\'t touch root directory as a parent', async t => {
  const pages = new Set(['README.md']);
  const page = {
    path: 'a/hello.md',
    content: '<a href="../">world</a>'
  };
  const $ = await rewrite(pages, page);
  t.is($('a').attr('href'), '../');
});

test('.rewrite doesn\'t touch directory without README.md', async t => {
  const pages = new Set(['a/README.md']);
  const page = {
    path: 'hello.md',
    content: '<a href="b">world</a>'
  };
  const $ = await rewrite(pages, page);
  t.is($('a').attr('href'), 'b');
});
