import test from 'ava';
import cheerio from 'cheerio';
import Breadcrumbs from './breadcrumbs';

test('.crumbsFor a root page', t => {
  const crumbs = Breadcrumbs.crumbsFor('hello.md');
  t.deepEqual(crumbs, [{title: 'hello.md', link: false}]);
});

test('.crumbsFor a sub page', t => {
  const crumbs = Breadcrumbs.crumbsFor('a/hello.md');
  t.deepEqual(crumbs, [
    {path: 'a/_index.md', title: 'a', link: true},
    {title: 'hello.md', link: false}
  ]);
});

test('.crumbsFor an index page', t => {
  const crumbs = Breadcrumbs.crumbsFor('a/b/_index.md');
  t.deepEqual(crumbs, [
    {path: 'a/_index.md', title: 'a', link: true},
    {title: 'b', link: false}
  ]);
});

test('.addBreadcrumbs on a root page', t => {
  const page = {path: 'hello.md'};
  Breadcrumbs.addBreadcrumbs(page, 'Top', 'readme.md');
  const $crumbs = cheerio.load(page.content)('nav.wikify-breadcrumbs');
  t.is($crumbs.length, 1);
  t.is($crumbs.find('a').length, 1);
  t.is($crumbs.find('a').text(), 'Top');
  t.is($crumbs.find('a').attr('href'), '/readme.md');
  t.is($crumbs.find('.wikify-breadcrumbs-static').length, 1);
  t.is($crumbs.find('.wikify-breadcrumbs-static').text(), 'hello.md');
});

test('.addBreadcrumbs on a sub page', t => {
  const page = {path: 'a/hello.md'};
  Breadcrumbs.addBreadcrumbs(page, 'Top', 'readme.md');
  const $crumbs = cheerio.load(page.content)('nav.wikify-breadcrumbs');
  t.is($crumbs.length, 1);
  t.is($crumbs.find('a').length, 2);
  t.is(cheerio($crumbs.find('a').get(0)).text(), 'Top');
  t.is(cheerio($crumbs.find('a').get(0)).attr('href'), '/readme.md');
  t.is($crumbs.find('a').length, 2);
  t.is(cheerio($crumbs.find('a').get(1)).text(), 'a');
  t.is(cheerio($crumbs.find('a').get(1)).attr('href'), '/a/_index.md');
  t.is($crumbs.find('.wikify-breadcrumbs-static').length, 1);
  t.is($crumbs.find('.wikify-breadcrumbs-static').text(), 'hello.md');
});
