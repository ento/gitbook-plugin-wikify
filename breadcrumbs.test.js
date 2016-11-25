import test from 'ava';
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
