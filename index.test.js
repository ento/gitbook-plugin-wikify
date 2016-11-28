import test from 'ava';
import path from 'path';
import tester from 'gitbook-tester';

const builder = () => {
  return tester.builder()
        .withLocalPlugin(__dirname)
}

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

test.only('page: replaces link to a directory with a link to its index page', async t => {
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

// linkchecker
test.todo('page: reports page as ok if no broken link');
test.todo('page: reports broken link');
test.todo('page: ignores empty link');
test.todo('page: ignores external link');
test.todo('page: ignores in-page link');
test.todo('page: ignores link to parent directory');
test.todo('finish: reports orphaned pages');
test.todo('finish: reports orphaned directory');
test.todo('finish: reports ok if no orphan');
