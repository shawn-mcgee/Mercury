import { compact, filter, forEach, map, reduce } from "lodash";
import Event from "./Event"

export function Stage(canvas: HTMLCanvasElement, o ?: Stage.Options): Stage {
  const
    configureDebug           = o?.debug ??  false,
    configureW               = o?.w     ??      0,
    configureH               = o?.h     ??      0,
    configureBackgroundColor = o?.bg    ?? "#000",
    configureForegroundColor = o?.fg    ?? "#fff",
    configureScaleIncrement  = o?.scaleIncrement ,
    configureImageSmoothing  = o?.imageSmoothing ,

    tree = Event.Tree(),

    logicalCanvasElement = canvas,
    virtualCanvasElement = new OffscreenCanvas(
      configureW || logicalCanvasElement.width ,
      configureH || logicalCanvasElement.height
    ),
    logicalCanvasContext = logicalCanvasElement.getContext("2d") as          CanvasRenderingContext2D,
    virtualCanvasContext = virtualCanvasElement.getContext("2d") as OffscreenCanvasRenderingContext2D;
  // Virtual Scale
  let virtualScale = Math.min(
    logicalCanvasElement.width  / virtualCanvasElement.width,
    logicalCanvasElement.height / virtualCanvasElement.height
  )
  // Scale Increment
  if(configureScaleIncrement)
    virtualScale = Math.trunc(virtualScale / configureScaleIncrement) * configureScaleIncrement
  // Image Smoothing
  logicalCanvasContext.imageSmoothingEnabled = !!configureImageSmoothing
  virtualCanvasContext.imageSmoothingEnabled = !!configureImageSmoothing
  if(configureImageSmoothing) {
    logicalCanvasContext.imageSmoothingQuality = configureImageSmoothing
    virtualCanvasContext.imageSmoothingQuality = configureImageSmoothing
  }

  const stage = {
    configureDebug,
    configureW,
    configureH,
    configureBackgroundColor,
    configureForegroundColor,
    configureScaleIncrement ,
    configureImageSmoothing ,

    tree,

    logicalCanvasElement,
    virtualCanvasElement,
    logicalCanvasContext,
    virtualCanvasContext,
    virtualScale,

    debugInfo: new Map([
      [Metrics.FRAME_INFO , undefined],
      [Metrics.UPDATE_INFO, undefined],
      [Metrics.RENDER_INFO, undefined],
      [Metrics.CANVAS_INFO, undefined]
    ])
  }



  new ResizeObserver(() => resize(stage)).observe(logicalCanvasElement)

  Stage.listen(stage, "", Stage.OnResize, onResize)

  requestAnimationFrame(
    t0 => requestAnimationFrame(
      t1 => requestAnimationFrame(
        t2 => animate(stage, t0, t1, t2))))

  return stage
}

export interface Stage {
  configureDebug           : boolean
  configureW               : number
  configureH               : number
  configureBackgroundColor : string
  configureForegroundColor : string
  configureScaleIncrement ?: number
  configureImageSmoothing ?: ImageSmoothingQuality

  tree: Event.Tree

  logicalCanvasElement: HTMLCanvasElement
  virtualCanvasElement: OffscreenCanvas
  logicalCanvasContext: CanvasRenderingContext2D
  virtualCanvasContext: OffscreenCanvasRenderingContext2D
  virtualScale: number

  debugInfo: Map<string, string | undefined>
}

export namespace Stage {
  export interface Options {
    debug ?: boolean
    w     ?: number
    h     ?: number
    bg    ?: string
    fg    ?: string
    scaleIncrement ?: number
    imageSmoothing ?: ImageSmoothingQuality
  }

  export function getLogicalSize(stage: Stage) {
    return {
      w: stage.logicalCanvasElement.width,
      h: stage.logicalCanvasElement.height
    } as const
  }

  export function getVirtualSize(stage: Stage) {
    return {
      w: stage.virtualCanvasElement.width,
      h: stage.virtualCanvasElement.height
    } as const
  }

  export function getVirtualScale(stage: Stage) {
    return stage.virtualScale
  }

  export function listen  <T>(stage: Stage, path: Event.Path, type: Event.Type, listener: Event.Listener<T>, defer ?: boolean) {
    Event.Tree.listen(stage.tree, path, type, listener, defer)
  }

  export function deafen  <T>(stage: Stage, path: Event.Path, type: Event.Type, listener: Event.Listener<T>, defer ?: boolean) {
    Event.Tree.deafen(stage.tree, path, type, listener, defer)
  }

  function _delete(stage: Stage, path: Event.Path, defer ?: boolean) {
    Event.Tree.delete(stage.tree, path, defer)
  }

  export function dispatch<T>(stage: Stage, path: Event.Path, type: Event.Type, event: T, defer ?: boolean) {
    Event.Tree.dispatch(stage.tree, path, type, event, defer)
  }

  export function poll(stage: Stage) {
    Event.Tree.poll(stage.tree)
  }

  export function setDebugInfo(stage: Stage, id: string, info: string) {
    stage.debugInfo.set(id, info)
  }

  export function getDebugInfo(stage: Stage, id: string) {
    return stage.debugInfo.get(id)
  }

  export const OnResize = "on-resize"

  export interface OnResize {
    stage: Stage,
    w    : number,
    h    : number
  }  
}

export declare namespace Stage {
  function _delete(stage: Stage, path: Event.Path, defer ?: boolean): void
  export { _delete as delete }
}


function animate(stage: Stage, t0: number, t1: number, t2: number, m ?: Metrics) {
  const
    t =  (t2 - t0) / 1000,
    dt = (t2 - t1) / 1000;
  const a = performance.now()
  update(stage, t, dt, m)
  const b = performance.now()
  render(stage, t, dt, m)
  const c = performance.now()

  if(stage.configureDebug) {
    if(!m) m = Metrics()

    m.oneSecondAccumulator += t2 - t1

    const
      frameMilliseconds  = c - a,
      updateMilliseconds = b - a,
      renderMilliseconds = c - b;
    
    m.averageFrameAccumulator  += frameMilliseconds
    m.averageUpdateAccumulator += updateMilliseconds
    m.averageRenderAccumulator += renderMilliseconds

    m.minimumFrameAccumulator  = Math.min(m.minimumFrameAccumulator , frameMilliseconds )
    m.minimumUpdateAccumulator = Math.min(m.minimumUpdateAccumulator, updateMilliseconds)
    m.minimumRenderAccumulator = Math.min(m.minimumRenderAccumulator, renderMilliseconds)

    m.maximumFrameAccumulator  = Math.max(m.maximumFrameAccumulator , frameMilliseconds )
    m.maximumUpdateAccumulator = Math.max(m.maximumUpdateAccumulator, updateMilliseconds)
    m.maximumRenderAccumulator = Math.max(m.maximumRenderAccumulator, renderMilliseconds)

    m.framesAccumulator ++
    
    if(m.oneSecondAccumulator >= 1000) {
      // update metrics
      m.averageFrameMilliseconds  = m.averageFrameAccumulator  / m.framesAccumulator
      m.averageUpdateMilliseconds = m.averageUpdateAccumulator / m.framesAccumulator
      m.averageRenderMilliseconds = m.averageRenderAccumulator / m.framesAccumulator

      m.minimumFrameMilliseconds  = m.minimumFrameAccumulator
      m.minimumUpdateMilliseconds = m.minimumUpdateAccumulator
      m.minimumRenderMilliseconds = m.minimumRenderAccumulator

      m.maximumFrameMilliseconds  = m.maximumFrameAccumulator
      m.maximumUpdateMilliseconds = m.maximumUpdateAccumulator
      m.maximumRenderMilliseconds = m.maximumRenderAccumulator

      m.framesPerSecond = m.framesAccumulator

      Stage.setDebugInfo(stage, Metrics.FRAME_INFO , Metrics.getFrameString (m))
      Stage.setDebugInfo(stage, Metrics.UPDATE_INFO, Metrics.getUpdateString(m))
      Stage.setDebugInfo(stage, Metrics.RENDER_INFO, Metrics.getRenderString(m))
      Stage.setDebugInfo(stage, Metrics.CANVAS_INFO, Metrics.getCanvasString(stage))

      console.log(Metrics.getFrameString (m))
      console.log(Metrics.getUpdateString(m))
      console.log(Metrics.getRenderString(m))
      console.log(Metrics.getCanvasString(stage))

      // reset accumulators
      m.oneSecondAccumulator = 0

      m.averageFrameAccumulator  = 0
      m.averageUpdateAccumulator = 0
      m.averageRenderAccumulator = 0

      m.minimumFrameAccumulator  = Number.POSITIVE_INFINITY
      m.minimumUpdateAccumulator = Number.POSITIVE_INFINITY
      m.minimumRenderAccumulator = Number.POSITIVE_INFINITY

      m.maximumFrameAccumulator  = 0
      m.maximumUpdateAccumulator = 0
      m.maximumRenderAccumulator = 0

      m.framesAccumulator = 0
    }
  }

  requestAnimationFrame(t3 => animate(stage, t0, t2, t3, m))
}

function update(stage: Stage, t: number, dt: number, m ?: Metrics) {
  Stage.poll(stage)
}

function render(stage: Stage, t: number, dt: number, m ?: Metrics) {
  const
    logical = Stage.getLogicalSize (stage),
    virtual = Stage.getVirtualSize (stage),
    scale   = Stage.getVirtualScale(stage);

  // render virtual canvas
  stage.virtualCanvasContext.resetTransform()

  stage.virtualCanvasContext.fillStyle = stage.configureForegroundColor
  stage.virtualCanvasContext.fillRect(
    0, 0, virtual.w, virtual.h
  )

  // render logical canvas
  stage.logicalCanvasContext.resetTransform()

  stage.logicalCanvasContext.fillStyle = stage.configureBackgroundColor
  stage.logicalCanvasContext.fillRect(
    0, 0, logical.w, logical.h
  )

  stage.logicalCanvasContext.translate(
    (logical.w - virtual.w * scale) / 2,
    (logical.h - virtual.h * scale) / 2
  )
  stage.logicalCanvasContext.scale(
    scale,
    scale
  )
  stage.logicalCanvasContext.drawImage(
    stage.virtualCanvasElement, 0, 0
  )

  renderDebugInfo(stage)  
}

function renderDebugInfo(stage: Stage) {
  const
    logical = Stage.getLogicalSize (stage),
    virtual = Stage.getVirtualSize (stage),
    scale   = Stage.getVirtualScale(stage);

  stage.logicalCanvasContext.resetTransform()
  stage.logicalCanvasContext.fillStyle = "#000"
  stage.logicalCanvasContext.globalAlpha = 0.5

  const debugInfos = compact([...stage.debugInfo.values()])
  const debugInfoHeight = (debugInfos.length + 1) * 24
  stage.logicalCanvasContext.fillRect(
    0, 0, logical.w, debugInfoHeight
  )

  stage.logicalCanvasContext.fillStyle = "#fff"
  stage.logicalCanvasContext.globalAlpha = 1.0
  stage.logicalCanvasContext.font = "24px monospace"
  
  let y = 0
  forEach(debugInfos, info => {
    stage.logicalCanvasContext.fillText(info, 0, y += 24)
  })
}

function resize(stage: Stage) {
  Stage.dispatch<Stage.OnResize>(stage, "", Stage.OnResize, {
    stage,
    w: stage.logicalCanvasElement.getBoundingClientRect().width ,
    h: stage.logicalCanvasElement.getBoundingClientRect().height
  } as const)
}

function onResize({stage, w, h }: Stage.OnResize) {
  
  if(
    stage.logicalCanvasElement.width  === w &&
    stage.logicalCanvasElement.height === h
  ) return

  stage.logicalCanvasElement.width  = w
  stage.logicalCanvasElement.height = h
  stage.virtualCanvasElement = new OffscreenCanvas(
    stage.configureW || stage.logicalCanvasElement.width,
    stage.configureH || stage.logicalCanvasElement.height
  )
  stage.virtualCanvasContext = stage.virtualCanvasElement.getContext("2d") as OffscreenCanvasRenderingContext2D

  // Virtual Scale
  stage.virtualScale = Math.min(
    stage.logicalCanvasElement.width  / stage.virtualCanvasElement.width,
    stage.logicalCanvasElement.height / stage.virtualCanvasElement.height
  )
  // Scale Increment
  if(stage.configureScaleIncrement)
    stage.virtualScale = Math.trunc(stage.virtualScale / stage.configureScaleIncrement) * stage.configureScaleIncrement
  // Image Smoothing
  stage.logicalCanvasContext.imageSmoothingEnabled = !!stage.configureImageSmoothing
  stage.virtualCanvasContext.imageSmoothingEnabled = !!stage.configureImageSmoothing
  if(stage.configureImageSmoothing) {
    stage.logicalCanvasContext.imageSmoothingQuality = stage.configureImageSmoothing
    stage.virtualCanvasContext.imageSmoothingQuality = stage.configureImageSmoothing
  }

  Stage.setDebugInfo(stage, Metrics.CANVAS_INFO, Metrics.getCanvasString(stage))
}

function Metrics(): Metrics {
  return {
    oneSecondAccumulator: 0,

    averageFrameAccumulator : 0,
    minimumFrameAccumulator : Number.POSITIVE_INFINITY,
    maximumFrameAccumulator : 0,

    averageUpdateAccumulator: 0,
    minimumUpdateAccumulator: Number.POSITIVE_INFINITY,
    maximumUpdateAccumulator: 0,

    averageRenderAccumulator: 0,
    minimumRenderAccumulator: Number.POSITIVE_INFINITY,
    maximumRenderAccumulator: 0,

    framesAccumulator: 0,

    averageFrameMilliseconds: 0,
    minimumFrameMilliseconds: 0,
    maximumFrameMilliseconds: 0,

    averageUpdateMilliseconds: 0,
    minimumUpdateMilliseconds: 0,
    maximumUpdateMilliseconds: 0,

    averageRenderMilliseconds: 0,
    minimumRenderMilliseconds: 0,
    maximumRenderMilliseconds: 0,

    framesPerSecond: 0
  } as const
}

interface Metrics {

  oneSecondAccumulator: number

  averageFrameAccumulator : number
  minimumFrameAccumulator : number
  maximumFrameAccumulator : number

  averageUpdateAccumulator: number
  minimumUpdateAccumulator: number
  maximumUpdateAccumulator: number

  averageRenderAccumulator: number
  minimumRenderAccumulator: number
  maximumRenderAccumulator: number

  framesAccumulator: number

  averageFrameMilliseconds: number
  minimumFrameMilliseconds: number
  maximumFrameMilliseconds: number

  averageUpdateMilliseconds: number
  minimumUpdateMilliseconds: number
  maximumUpdateMilliseconds: number

  averageRenderMilliseconds: number
  minimumRenderMilliseconds: number
  maximumRenderMilliseconds: number

  framesPerSecond: number
}

namespace Metrics {
  export function getFrameString(m: Metrics) {
    return `Frame : ${m.framesPerSecond}hz @ ${m.averageFrameMilliseconds.toFixed(2)}ms (${m.minimumFrameMilliseconds.toFixed(2)}ms - ${m.maximumFrameMilliseconds.toFixed(2)}ms)`
  }

  export function getUpdateString(m: Metrics) {
    return `Update:        ${m.averageUpdateMilliseconds.toFixed(2)}ms (${m.minimumUpdateMilliseconds.toFixed(2)}ms - ${m.maximumUpdateMilliseconds.toFixed(2)}ms)`
  }

  export function getRenderString(m: Metrics) {
    return `Render:        ${m.averageRenderMilliseconds.toFixed(2)}ms (${m.minimumRenderMilliseconds.toFixed(2)}ms - ${m.maximumRenderMilliseconds.toFixed(2)}ms)`
  }

  export function getCanvasString(s: Stage) {
    const logical = Stage.getLogicalSize(s)
    const virtual = Stage.getVirtualSize(s)
    const scale   = (Stage.getVirtualScale(s) * 100).toFixed(0)

    return `Canvas: [${logical.w}x${logical.h}] (${virtual.w}x${virtual.h}) ${scale}%`
  }

  export const FRAME_INFO  = "frame-info"
  export const UPDATE_INFO = "update-info"
  export const RENDER_INFO = "render-info"
  export const CANVAS_INFO = "canvas-info"
}

export default Stage