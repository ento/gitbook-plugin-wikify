import test from 'ava';
import PageLinks from './page_links';
import loadLocationUtils from './load_location_utils';

const locationUtilsPromise = loadLocationUtils(process.env.GITBOOK_VERSION || '*');

const findGoodAndBadLinks = (pages, page) => {
  return locationUtilsPromise
    .then(utils => {
      return PageLinks.findGoodAndBadLinks(utils, pages, page);
    });
};

test('.findGoodAndBadLinks returns good link to a sibling page', async t => {
  const paths = new Set(['hello.md']);
  const page = {path: 'world.md', content: '<a href="hello.md">hello</a>'};
  const links = await findGoodAndBadLinks(paths, page);
  t.is(links.good.length, 1);
  t.is(links.good[0], [...paths][0]);
  t.is(links.bad.length, 0);
});

test('.findGoodAndBadLinks returns good link to a parent page', async t => {
  const paths = new Set(['hello.md']);
  const page = {path: 'a/world.md', content: '<a href="../hello.md">hello</a>'};
  const links = await findGoodAndBadLinks(paths, page);
  t.is(links.good.length, 1);
  t.is(links.good[0], [...paths][0]);
  t.is(links.bad.length, 0);
});

test('.findGoodAndBadLinks returns good link to a child page', async t => {
  const paths = new Set(['a/hello.md']);
  const page = {path: 'world.md', content: '<a href="a/hello.md">hello</a>'};
  const links = await findGoodAndBadLinks(paths, page);
  t.is(links.good.length, 1);
  t.is(links.good[0], [...paths][0]);
  t.is(links.bad.length, 0);
});

test('.findGoodAndBadLinks returns good link without fragment', async t => {
  const paths = new Set(['hello.md']);
  const page = {path: 'world.md', content: '<a href="hello.md#hello">hello</a>'};
  const links = await findGoodAndBadLinks(paths, page);
  t.is(links.good.length, 1);
  t.is(links.good[0], [...paths][0]);
  t.is(links.bad.length, 0);
});

test('.findGoodAndBadLinks ignores empty link', async t => {
  const paths = new Set(['']);
  const page = {path: 'world.md', content: '<a href="">hello</a>'};
  const links = await findGoodAndBadLinks(paths, page);
  t.is(links.good.length, 0);
  t.is(links.bad.length, 0);
});

test('.findGoodAndBadLinks ignores external link', async t => {
  const paths = new Set(['http://example.com']);
  const page = {path: 'world.md', content: '<a href="http://example.com">hello</a>'};
  const links = await findGoodAndBadLinks(paths, page);
  t.is(links.good.length, 0);
  t.is(links.bad.length, 0);
});

test('.findGoodAndBadLinks ignores in-page fragment', async t => {
  const paths = new Set(['here']);
  const page = {path: 'world.md', content: '<a href="#here">here</a>'};
  const links = await findGoodAndBadLinks(paths, page);
  t.is(links.good.length, 0);
  t.is(links.bad.length, 0);
});

test('.findGoodAndBadLinks ignores link to itself', async t => {
  const paths = new Set(['hello.md']);
  const page = {path: 'hello.md', content: '<a href="hello.md">here</a>'};
  const links = await findGoodAndBadLinks(paths, page);
  t.is(links.good.length, 0);
  t.is(links.bad.length, 0);
});

test('.findGoodAndBadLinks returns broken link', async t => {
  const paths = new Set([]);
  const page = {path: 'world.md', content: '<a href="hello.md">here</a>'};
  const links = await findGoodAndBadLinks(paths, page);
  t.is(links.good.length, 0);
  t.is(links.bad.length, 1);
  t.is(links.bad[0], 'hello.md');
});
