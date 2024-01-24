import { forEach, reduce } from "lodash"
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
    export function listen  <T>(tree: Event.Tree, type  : Clazz<T>, listener  : Event.Listener<T>, o ?: Event.Options) {
      const a: Listen<T> = { action: LISTEN, type, listener, ...o }
      if(o?.defer ?? true) _queue(tree, a)
      else                 _flush(tree, a)
    }

    export function deafen  <T>(tree: Event.Tree, type ?: Clazz<T>, listener ?: Event.Listener<T>, o ?: Event.Options) {
      const a: Deafen<T> = { action: DEAFEN, type, listener, ...o }
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

      

      

    }

    function _require(tree: Event.Tree, path ?: Event.Path, root = tree._root) {
      if(!path) return root
    }
  }

  export function Node(): Event.Node {
    
  }

  export interface Node {
    _from ?:             Event.Node
    _join ?: Map<string, Event.Node>


  }

  export namespace Node {

  }

  export type Path = string | Iterable<Path>

  export interface Options { path ?: Event.Path, defer ?: boolean }
  export interface Context<T> {
    tree: Event.Tree
    path: Event.Path
    type: Clazz<T>
    self: Event.Listener<T>
  }

  export type Listener<T> = (event: T, context: Event.Context<T>) => void

  const LISTEN   = Symbol()
  const DEAFEN   = Symbol()
  const DISPATCH = Symbol()

  interface Listen  <T> extends Event.Options{ action: typeof LISTEN, type  : Clazz<T>, listener  : Event.Listener<T> }
  interface Deafen  <T> extends Event.Options{ action: typeof DEAFEN, type ?: Clazz<T>, listener ?: Event.Listener<T> }
  interface Dispatch<T> extends Event.Options{ action: typeof DISPATCH, event: T }

  type Action<T> = Listen<T> | Deafen<T> | Dispatch<T>

  type Listening<T> = { type: Clazz<T>, self: Event.Listener<T> }
}

export default Event