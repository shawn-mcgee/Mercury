import { filter, forEach, reduce } from "lodash"
import Clazz from "../util/Clazz"


export namespace Event {

  export function walk(...path: Array<Event.Path>): Array<string> {
    return reduce(path, (a, part) => {
      if(typeof part === "string")
        return [...a, ...part.split("/")]
      else
        return [...a, ...walk( ...part )]
    }, new Array())
  }

  export function join(...path: Array<Event.Path>) {
    return walk(path).join("/")
  }

  export function Tree(): Event.Tree {
    return {
      _root: Event.Node(),
      _todo:  new Array()
    }
  }  

  export interface Tree {
    _root: Event.Node
    _todo: Array<Action<any>>
  }

  export namespace Tree {
    export function listen  <T>(tree: Event.Tree, type  : Clazz<T>, callback  : Event.Callback<T>, o ?: Event.Options) {
      const a: Listen<T> = { action: LISTEN, type, callback, ...o }
      if(o?.defer ?? true) _queue(tree, a)
      else                 _flush(tree, a)
    }

    export function deafen  <T>(tree: Event.Tree, type ?: Clazz<T>, callback ?: Event.Callback<T>, o ?: Event.Options) {
      const a: Deafen<T> = { action: DEAFEN, type, callback, ...o }
      if(o?.defer ?? true) _queue(tree, a)
      else                 _flush(tree, a)
    }

    export function dispatch<T>(tree: Event.Tree, event: T, o ?: Event.Options) {
      const a: Dispatch<T> = { action: DISPATCH, event, ...o }
      if(o?.defer ?? true) _queue(tree, a)
      else                 _flush(tree, a)
    }

    export function poll(tree: Event.Tree) {
      forEach(tree._todo.splice(0, tree._todo.length),
        a => _flush(tree, a)
      )
    }

    function _queue<T>(tree: Event.Tree, a: Action<T>) {
      tree._todo.push(a)
    }

    function _flush<T>(tree: Event.Tree, a: Action<T>) {
      switch(a.action) {
        case LISTEN  : return _onListen  (tree, a)
        case DEAFEN  : return _onDeafen  (tree, a)
        case DISPATCH: return _onDispatch(tree, a)
      }
    }

    function _onListen  <T>(tree: Event.Tree, a: Listen  <T>) {

    }

    function _onDeafen  <T>(tree: Event.Tree, a: Deafen  <T>) {

    }

    function _onDispatch<T>(tree: Event.Tree, a: Dispatch<T>) {

    }

    function _request(tree: Event.Tree, path ?: Event.Path, root = tree._root) {
      if(!path) return root

      for(const name of Event.walk(path)) {
        const node = root._children.get(name)
        if(!node) return
        root = node
      }

      return root
    }

    function _require(tree: Event.Tree, path ?: Event.Path, root = tree._root) {
      if(!path) return root

      for(const name of Event.walk(path)) {
        let node = root._children.get(name)
        if(!node) {
          node     =     Event.Node(root)
          root._children.set(name , node)
        }
        root = node
      }

      return root
    }

    function _listeners<T>(node: Event.Node, type ?: Clazz<T>) {
      return filter(node._listeners, ({type, self}) => {
        
      })
    }
  }

  export function Node(_parent ?: Event.Node): Event.Node {
    return {
      _parent,
      _children : new Map(),
      _listeners: new Set()
    }
  }

  export interface Node {
    _parent ?:              Event.Node
    _children : Map<string, Event.Node>
    _listeners: Set<Listener<any>>
  }

  export namespace Node {

  }

  export type Callback<T> = (event: T, context: Event.Context<T>)  =>  void

  export function Listener<T>() {

  }

  export interface Listener<T> {
    type: Clazz<T>
    callback: Event.Callback<T>
  }

  export namespace Listener    {

  }

  export function isCallback<T>(a: Event.Callback<T> | Event.Listener<T>): a is Callback<T> {
    return typeof a === "function"
  }

  export function isListener<T>(a: Event.Callback<T> | Event.Listener<T>): a is Listener<T> {
    return typeof a === "object"
  }

  export type Path = string | Iterable<Path>

  export interface Options { path ?: Event.Path, defer ?: boolean }
  export interface Context<T> {
    tree: Event.Tree
    path: Event.Path
    self: Event.Listener<T>
  }

  const LISTEN   = Symbol()
  const DEAFEN   = Symbol()
  const DISPATCH = Symbol()

  interface Listen  <T> extends Event.Options{ action: typeof LISTEN, type  : Clazz<T>, callback  : Event.Callback<T> }
  interface Deafen  <T> extends Event.Options{ action: typeof DEAFEN, type ?: Clazz<T>, callback ?: Event.Callback<T> }
  interface Dispatch<T> extends Event.Options{ action: typeof DISPATCH, event: T }

  type Action<T> = Listen<T> | Deafen<T> | Dispatch<T>
}

export default Event