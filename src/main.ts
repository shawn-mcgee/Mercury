import Mercury from "./hg/Mercury";
import Event from "./hg/core/Event";
import Stage from "./hg/core/Stage";
import Version from "./hg/util/Version";

console.log(Version.toString(Mercury.VERSION))


const app = document.querySelector("#app") as HTMLDivElement

const canvas = document.createElement("canvas")
  canvas.style.position = "absolute"
  canvas.style.top      = "0px"
  canvas.style.left     = "0px"
  canvas.style.width    = "100dvw"
  canvas.style.height   = "100dvh"

app.appendChild(canvas)

const stage = Stage(canvas, {debug: true, w: 64, h: 64, scaleIncrement: 1})