import { forEach, reduce } from "lodash"

export namespace Event {

  export type Type = string
  export type Path = string | Array<string>

  export interface Context<T> {
    tree: Tree
    path: string
    type: Type
    self: Listener<T>
  }

  export type Listener<T> = (event: T, context: Context<T>) => void

  export function self<T>(context: Context<T>) {
    return [
      context.tree,
      context.path,
      context.type,
      context.self
    ] as const
  }
  
  export function once<T>(listener: Listener<T>, n = 1): Listener<T> {
    return (event, context) => {
      listener(event, context)
      if(--n <= 0) 
        Tree.deafen(...self(context), false)
    }
  }

  export namespace Path {
    export function split(path: string) {
      return path.split('/').map(s => s.trim()).filter(s => s.length > 0)
    }
  
    export function walk(...path: Array<Path>): Array<string> {
      return reduce(path, (a, b) => {
        if(Array.isArray(b)) return a.concat(walk (b))
        else                 return a.concat(split(b))
      }, new Array())
    }
  
    export function join(...path: Array<Path>) {
      return walk(...path).join('/')
    }
  }

  export function Tree(): Tree {
    return {
      root : Node(),
      queue:     []
    }
  }

  export interface Tree {
    root: Node
    queue: Array<Action>
    
  }

  export namespace Tree {

    export function listen  <T>(tree: Tree, path: Path, type: Type, listener: Listener<T>, defer ?: boolean) {
      const a: Listen = { action: LISTEN, path: Path.join(path), type, listener }
      if(defer ?? true) queue(tree, a)
      else              flush(tree, a)
    }
    
    export function deafen  <T>(tree: Tree, path: Path, type: Type, listener: Listener<T>, defer ?: boolean) {
      const a: Deafen = { action: DEAFEN, path: Path.join(path), type, listener }
      if(defer ?? true) queue(tree, a)
      else              flush(tree, a)
    }    

    function _delete(tree: Tree, path: Path, defer ?: boolean) {
      const a: Delete = { action: DELETE, path: Path.join(path) }
      if(defer ?? true) queue(tree, a)
      else              flush(tree, a)
    }

    export function dispatch<T>(tree: Tree, path: Path, type: string, event: T, defer ?: boolean) {
      const a: Dispatch = { action: DISPATCH, path: Path.join(path), type, event }
      if(defer ?? true) queue(tree, a)
      else              flush(tree, a)
    }

    export function poll(tree: Tree) {
      const q = tree.queue.slice()
      tree.queue.length = 0
      forEach(q, a => flush(tree, a))
    }

    function queue(tree: Tree, a: Action) {
      tree.queue.push(a)
    }

    function flush(tree: Tree, a: Action) {
      switch (a.action) {
        case LISTEN:   return onListen  (tree, a);
        case DEAFEN:   return onDeafen  (tree, a);
        case DISPATCH: return onDispatch(tree, a);
        case DELETE:   return onDelete  (tree, a);
      }
    }

    function requestNode(tree: Tree, path: string) {
      return Node.requestNode(tree.root, path)
    }

    function requireNode(tree: Tree, path: string) {
      return Node.requireNode(tree.root, path)
    }

    function requestListeners(tree: Tree, path: string, type: Type) {
      const node = requestNode(tree, path)
      if(!node) return
      return Node.requestListeners(node, type)
    }

    function requireListeners(tree: Tree, path: string, type: Type) {
      const node = requireNode(tree, path)
      return Node.requireListeners(node, type)
    }

    function onListen(tree: Tree, a: Listen) {
      requireListeners(tree, a.path, a.type).add    (a.listener)
    }

    function onDeafen(tree: Tree, a: Deafen) {
      requestListeners(tree, a.path, a.type)?.delete(a.listener)
    }

    function onDelete(tree: Tree, a: Delete) {
      const path = Path.walk(a.path)
      const name = path.pop()
      if(!name) return 

      const parent = requestNode(tree, Path.join(path))
      if(!parent) return

      parent.children.delete(name)
    }

    function onDispatch(tree: Tree, a: Dispatch) {
      const node = requestNode(tree, a.path)
      if(!node) return
      cascade(tree, node, a.path, a.type, a.event)
    }

    function cascade(tree: Tree, node: Node, path: string, type: Type, event: any) {
      const listeners = requestListeners(tree, path, type)
      if(listeners) for(const self of listeners) {
        self(event, { tree, path, type, self })
      }
      for(const [name, child] of node.children) {
        cascade(tree, child, Path.join(path, name), type, event)
      }
    }
  }

  export declare namespace Tree {
    function _delete(tree: Tree, path: Path, defer ?: boolean): void
    export { _delete as delete }
  }

  function Node(): Node {
    return {
      children : new Map(),
      listeners: new Map()
    }
  }

  interface Node {
    children : Map<string, Node>
    listeners: Map<Type, Set<Listener<any>>>
  }

  namespace Node {


    export function requestNode(root: Node, path: string) {
      for(const name of Path.split(path)) {
        let node = root.children.get(name)
        if(!node) return
        root = node
      }
      return root
    }

    export function requireNode(root: Node, path: string) {
      for(const name of Path.split(path)) {
        let node = root.children.get(name)
        if(!node) {
          node = Node()
          root.children.set(name, node)
        }
        root = node
      }
      return root
    }

    export function requestListeners(node: Node, type: Type) {
      return node.listeners.get(type)
    }

    export function requireListeners(node: Node, type: Type) {
      let listeners = node.listeners.get(type)
      if(!listeners) {
        listeners = new Set()
        node.listeners.set(type, listeners)
      }
      return listeners
    }
  }

  const LISTEN   = Symbol()
  const DEAFEN   = Symbol()
  const DELETE   = Symbol()  
  const DISPATCH = Symbol()
  
  interface Listen   { action: typeof LISTEN  , path: string, type: Type, listener: Listener<any> }
  interface Deafen   { action: typeof DEAFEN  , path: string, type: Type, listener: Listener<any> }  
  interface Delete   { action: typeof DELETE  , path: string                         }
  interface Dispatch { action: typeof DISPATCH, path: string, type: Type, event: any }

  type Action = Listen | Deafen | Delete | Dispatch
}

export default Event