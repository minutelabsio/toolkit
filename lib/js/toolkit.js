///////////////////////////////////////////
// MinuteLabs.io Toolkit Library
// author: Jasper Palfree (info@minutelabs.io)
// For educational use.
// Copyright 2020 Jasper Palfree
// License: GPLv3
///////////////////////////////////////////

// -------------------------------------------
// General Utilities
// -------------------------------------------
function lerp(min, max, v) {
  return max * v + min * (1 - v)
}

function rescale(min, max, v) {
  return (v - min) / (max - min)
}

function forEachPair(arr, fn) {
  let length = arr.length
  for (let i = 0; i < length; i++) {
    let el1 = arr[i]
    for (let j = i + 1; j < length; j++) {
      let el2 = arr[j]
      fn(el1, el2)
    }
  }
}

function debounce(fn, delay = 50) {
  let to
  let self
  let args
  let cb = function () {
    fn.apply(self, args)
  }

  return function () {
    self = this
    args = arguments
    clearTimeout(to)
    to = setTimeout(cb, delay)
  }
}

function throttle(fn, delay = 50) {
  let to
  let call = false
  let args
  let cb = function () {
    clearTimeout(to)
    if (call) {
      call = false
      to = setTimeout(cb, delay)
      fn.apply(null, args)
    } else {
      to = false
    }
  }

  return function () {
    call = true
    args = arguments
    if (!to) {
      cb()
    }
  }
}

const onFrame = (function () {
  const listeners = []
  let previousTime = performance.now() - 12

  let fps = 30
  function animate() {
    requestAnimationFrame(animate)
    let now = performance.now()
    let dt = now - previousTime
    previousTime = now
    fps = lerp(fps, 1000 / dt, 0.2)
    listeners.forEach(f => f(dt, fps))
  }

  animate()

  return function (fn) {
    listeners.push(fn)
    const stop = () => {
      listeners.splice(listeners.indexOf(fn), 1)
    }
    return stop
  }
})()

// -------------------------------------------
// Draw Tools
// -------------------------------------------
function getDrawTools({
  autoResize = false,
  pixelRatio = (window.devicePixelRatio || 1),
  zoom = 1,
  width = 0,
  height = 0,
  aspect = 16 / 9,
  parent = document.body,
  background = 'hsl(0, 0%, 10%)',
  onResize = () => { }
} = {}) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const resize = { w: !width, h: !height }
  const dimensions = {}

  canvas.style.background = background
  canvas.style.transform = `scale(${1 / pixelRatio})`
  canvas.style.transformOrigin = 'top left'

  const _onResize = () => {
    if (resize.w) {
      width = parent.offsetWidth
    }

    if (resize.h) {
      height = width / aspect
    }

    dimensions.width = width / zoom
    dimensions.height = height / zoom

    canvas.width = pixelRatio * width
    canvas.height = pixelRatio * height
    ctx.scale(zoom * pixelRatio, zoom * pixelRatio)
    onResize(dimensions)
  }

  parent.appendChild(canvas)

  if (autoResize) {
    window.addEventListener('resize', _onResize)
  }

  _onResize()

  const destroy = () => {
    if (autoResize) {
      window.removeEventListener('resize', _onResize)
    }
    canvas.parentNode.removeChild(canvas)
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)
  }

  return {
    canvas,
    ctx,
    destroy,
    clearCanvas,
    dimensions
  }
}

function drawCircle(ctx, x, y, r, color) {
  if (color !== ctx.fillStyle) {
    ctx.fillStyle = color
  }
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 2 * Math.PI)
  ctx.fill()
}

function drawLine(ctx, p1, p2, color, lineWidth = 2) {
  if (color !== ctx.fillStyle) {
    ctx.strokeStyle = color
  }
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.stroke()
}

// -------------------------------------------
// Physics Helpers
// -------------------------------------------
class VelocityVerlet {
  constructor(objects, stepSize = 8) {
    this.maxSteps = 20
    this.stepSize = stepSize
    this.objects = objects
    this.time = 0
    this.interactions = []
    this.tmp = V()
  }

  step(dt) {
    let stepSize = this.stepSize
    if (!dt) { dt = stepSize }

    let maxTime = this.maxSteps * stepSize
    let now = this.time
    let target = this.time + dt

    if (dt > maxTime){
      now -= maxTime
    }

    for (; now < target; now += stepSize) {
      this.time = now
      this.integrate(stepSize)
    }

    // remainder
    if (now !== target) {
      this.time = target
      this.integrate(target - now)
    }

    return this
  }

  integrate(dt) {
    let tmp = this.tmp
    let halfDt = 0.5 * dt
    // stage 1: shift positions
    let l = this.objects.length
    for (let i = 0; i < l; i++) {
      let obj = this.objects[i]
      let oldAcc = obj.oldAcc || (obj.oldAcc = V())
      oldAcc.copy(obj.acceleration)
      // dx = ( (1/2) * a * dt + v ) * dt
      tmp.copy(obj.acceleration).multiply(halfDt)
      tmp.add(obj.velocity)
      tmp.multiply(dt)
      obj.position.add(tmp)
      // reset acceleration in anticipation of stage 2
      obj.acceleration.set(0, 0)
    }

    // stage 2: change acceleration (from interactions)
    this.interact(dt)

    this.kinetic = 0
    // stage 3: shift velocities
    for (let i = 0; i < l; i++) {
      let obj = this.objects[i]
      let m = obj.m || 1
      // dv = (1/2) * (old_a + a) * dt
      tmp.copy(obj.oldAcc).add(obj.acceleration)
      tmp.multiply(halfDt)
      obj.velocity.add(tmp)
      this.kinetic += 0.5 * m * obj.velocity.normSq()
    }

    return this
  }

  interact(dt) {
    let objs = this.objects
    let fns = this.interactions

    for (let i = 0, l = fns.length; i < l; i++) {
      fns[i](objs, dt)
    }

    return this
  }

  onInteraction(fn) {
    this.interactions.push(fn)
    return this
  }
}