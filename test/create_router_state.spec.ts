import {DefaultUrlSerializer} from '../src/url_serializer';
import {UrlTree, UrlSegment} from '../src/url_tree';
import {TreeNode} from '../src/utils/tree';
import {Params, PRIMARY_OUTLET} from '../src/shared';
import {ActivatedRoute, RouterState, RouterStateSnapshot, createEmptyState, advanceActivatedRoute} from '../src/router_state';
import {createRouterState} from '../src/create_router_state';
import {recognize} from '../src/recognize';
import {RouterConfig} from '../src/config';

describe('create router state', () => {
  const emptyState = () => createEmptyState(new UrlTree(new UrlSegment([], {}), {}, null), RootComponent);

  it('should work create new state', () => {
    const state = createRouterState(createState([
      {path: 'a', component: ComponentA},
      {path: 'b', component: ComponentB, outlet: 'left'},
      {path: 'c', component: ComponentC, outlet: 'right'}
    ], "a(left:b//right:c)"), emptyState());

    checkActivatedRoute(state.root, RootComponent);

    const c = state.children(state.root);
    checkActivatedRoute(c[0], ComponentA);
    checkActivatedRoute(c[1], ComponentB, 'left');
    checkActivatedRoute(c[2], ComponentC, 'right');
  });

  it('should reuse existing nodes when it can', () => {
    const config = [
      {path: 'a', component: ComponentA},
      {path: 'b', component: ComponentB, outlet: 'left'},
      {path: 'c', component: ComponentC, outlet: 'left'}
    ];

    const prevState = createRouterState(createState(config, "a(left:b)"), emptyState());
    advanceState(prevState);
    const state = createRouterState(createState(config, "a(left:c)"), prevState);

    expect(prevState.root).toBe(state.root);
    const prevC = prevState.children(prevState.root);
    const currC = state.children(state.root);

    expect(prevC[0]).toBe(currC[0]);
    expect(prevC[1]).not.toBe(currC[1]);
    checkActivatedRoute(currC[1], ComponentC, 'left');
  });

  it('should handle componentless routes', () => {
    const config = [
      { path: 'a/:id', children: [
        { path: 'b', component: ComponentA },
        { path: 'c', component: ComponentB, outlet: 'right' }
      ] }
    ];


    const prevState = createRouterState(createState(config, "a/1;p=11/(b//right:c)"), emptyState());
    advanceState(prevState);
    const state = createRouterState(createState(config, "a/2;p=22/(b//right:c)"), prevState);

    expect(prevState.root).toBe(state.root);
    const prevP = prevState.firstChild(prevState.root);
    const currP = state.firstChild(state.root);
    expect(prevP).toBe(currP);

    const prevC = prevState.children(prevP);
    const currC = state.children(currP);

    expect(currP._futureSnapshot.params).toEqual({id: '2', p: '22'});
    checkActivatedRoute(currC[0], ComponentA);
    checkActivatedRoute(currC[1], ComponentB, 'right');
  });
});

function advanceState(state: RouterState): void {
  advanceNode(state._root);
}

function advanceNode(node: TreeNode<ActivatedRoute>): void {
  advanceActivatedRoute(node.value);
  node.children.forEach(advanceNode);
}

function createState(config: RouterConfig, url: string): RouterStateSnapshot {
  let res: RouterStateSnapshot;
  recognize(RootComponent, config, tree(url), url).forEach(s => res = s);
  return res;
}

function checkActivatedRoute(actual: ActivatedRoute, cmp: Function, outlet: string = PRIMARY_OUTLET):void {
  if (actual === null) {
    expect(actual).toBeDefined();
  } else {
    expect(actual.component).toBe(cmp);
    expect(actual.outlet).toEqual(outlet);
  }
}

function tree(url: string): UrlTree {
  return new DefaultUrlSerializer().parse(url);
}

class RootComponent {}
class ComponentA {}
class ComponentB {}
class ComponentC {}
