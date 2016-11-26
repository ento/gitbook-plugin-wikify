import test from 'ava';
import tester from 'gitbook-tester';

const builder = () => {
  return tester.builder()
        .withLocalPlugin(__dirname)
}

test.only("page: doesn't create breadcrumbs for readme", async t => {
  const result = await builder()
        .withContent('Intro')
        .create();
  t.is(result.get('index.html').$('nav.wiki-breadcrumbs').length, 0);
});

test.todo('page: creates breadcrumbs');
test.todo('page: creates breadcrumb for readme in a non-cwd root');
test.todo('page: replaces link to a directory with a link to its index page');

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
