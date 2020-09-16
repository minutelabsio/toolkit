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
function lerp(min, max, v, clamp = false) {
  if (clamp) {
    if (v >= 1) { return max }
    if (v <= 0) { return min }
  }
  return max * v + min * (1 - v)
}

function rescale(min, max, v, clamp = false) {
  if (clamp) {
    if (v >= max) { return 1 }
    if (v <= min) { return 0 }
  }
  return (v - min) / (max - min)
}

function createScale(domain, range) {
  let s = (x, clamp) => lerp(range[0], range[1], rescale(domain[0], domain[1], x), clamp)
  s.inverse = (y, clamp) => lerp(domain[0], domain[1], rescale(range[0], range[1], y), clamp)
  return s
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

function getFnParameters(fn) {
  let m = fn.toString().match(/\(([^)\[\]{}}]+)\)/)
  if (!m) { return [] }

  let vars = m[1].replace(/\s|=[^,]+/g, '').split(',')

  return vars
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

function Stats(initialData = []) {
  let m = 0
  let s = 0
  let n = 0
  let _max = Number.NEGATIVE_INFINITY
  let _min = Number.POSITIVE_INFINITY
  let total = 0

  // Push a value to a running average calculation.
  // see [http://www.johndcook.com/blog/standard_deviation]
  // Note: variance can be calculated from the "s" value by multiplying it by `1/(n-1)`
  function push(v) {
    n++
    let x = v - m

    // Mk = Mk-1 + (xk – Mk-1)/k
    // Sk = Sk-1 + (xk – Mk-1)*(xk – Mk).
    m += x / n
    s += x * (v - m)

    // max / min
    _max = Math.max(v, _max)
    _min = Math.min(v, _min)
    total += v
  }

  function mean() {
    return m
  }

  function variance() {
    if (n <= 1) {
      return 0
    }

    return s / (n - 1)
  }

  function deviation() {
    return Math.sqrt(variance())
  }

  function max() { return _max }
  function min() { return _min }
  function sum() { return total }
  function count() { return n }

  function toObject() {
    return {
      mean: mean()
      , variance: variance()
      , deviation: deviation()
      , sum: sum()
      , count: count()
      , max: max()
      , min: min()
    }
  }

  for (let i = 0, l = initialData.length; i < l; i++) {
    push(initialData[i])
  }

  return {
    mean
    , variance
    , deviation
    , sum
    , count
    , max
    , min
    , push
    , toObject
  }
}

function rndNorm(mean = 0, sigma = 1) {
  let g = Math.random() + Math.random() + Math.random()
  return 2 * sigma * (g - 1) + mean - 3
}

const onFrame = (function () {
  const listeners = []

  // Includes Modified Runner tick method from https://brm.io/matter-js/
  // Licensed: MIT
  function tick(time, runner) {
    let timeScale = runner.timeScale
    let correction = 1
    let delta

    if (runner.isFixed) {
      // fixed timestep
      delta = runner.delta
    } else {
      // dynamic timestep based on wall clock between calls
      delta = (time - runner.timePrev) || runner.delta
      runner.timePrev = time

      // optimistically filter delta over a few frames, to improve stability
      runner.deltaHistory.push(delta)
      runner.deltaHistory = runner.deltaHistory.slice(-runner.deltaSampleSize)
      delta = Math.min.apply(null, runner.deltaHistory)

      // limit delta
      delta = delta < runner.deltaMin ? runner.deltaMin : delta
      delta = delta > runner.deltaMax ? runner.deltaMax : delta

      // correction for delta
      correction = delta / runner.delta

      // update engine timing object
      runner.delta = delta
    }

    // time correction for time scaling
    if (runner.timeScalePrev !== 0) {
      correction *= timeScale / runner.timeScalePrev
    }

    if (timeScale === 0) {
      correction = 0
    }

    runner.timeScalePrev = timeScale
    runner.correction = correction

    // fps counter
    runner.frameCounter += 1
    if (time - runner.counterTimestamp >= 1000) {
      runner.fps = runner.frameCounter * ((time - runner.counterTimestamp) / 1000)
      runner.counterTimestamp = time
      runner.frameCounter = 0
    }

    return delta
  }

  function animate() {
    requestAnimationFrame(animate)
    let now = performance.now()
    listeners.forEach(o => {
      let dt = tick(now, o.opts)
      o.fn(dt * o.opts.timeScale, now, o.opts)
    })
  }

  animate()

  const defaultOpts = {
    fps: 60,
    correction: 1,
    deltaSampleSize: 60,
    counterTimestamp: 0,
    frameCounter: 0,
    deltaHistory: [],
    timePrev: null,
    timeScalePrev: 1,
    isFixed: false,
    timeScale: 1
  }

  return function onFrame(fn, opts) {
    opts = Object.assign({}, defaultOpts, opts)

    opts.delta = opts.delta || 1000 / opts.fps
    opts.deltaMin = opts.deltaMin || 1000 / opts.fps
    opts.deltaMax = opts.deltaMax || 1000 / (opts.fps * 0.5)
    opts.fps = 1000 / opts.delta

    listeners.push({ fn, opts })
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
  const wrap = document.createElement('div')
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const resize = { w: !width, h: !height }
  const dimensions = {}

  wrap.style.overflow = 'hidden'

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
    wrap.style.width = width + 'px'
    wrap.style.height = height + 'px'
    onResize(dimensions)
  }

  wrap.appendChild(canvas)
  parent.appendChild(wrap)

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

  function toCanvasCoords(v, fromDocument = false) {
    let ret = v.clone()
    if (fromDocument) {
      let offset = canvas.getBoundingClientRect()
      ret.x -= offset.left
      ret.y -= offset.top
    }
    return ret.multiply(1 / zoom)
  }

  return {
    canvas,
    ctx,
    destroy,
    clearCanvas,
    dimensions,
    toCanvasCoords
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

function drawLine(ctx, p1, p2, color = 'grey', lineWidth = 2) {
  if (color !== ctx.fillStyle) {
    ctx.strokeStyle = color
  }
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.stroke()
}

function drawLines(ctx, points, color = 'grey', lineWidth = 2, closed = false) {
  if (color !== ctx.fillStyle) {
    ctx.strokeStyle = color
  }
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 0, l = points.length; i < l; i++) {
    let p = points[i]
    ctx.lineTo(p.x, p.y)
  }
  if (closed) {
    ctx.closePath()
  }
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

    if (dt > maxTime) {
      now = target - maxTime
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

// -------------------------------------------
// Widgets
// -------------------------------------------

function createFPSMonitor(el = document.body) {
  const width = 10
  const height = 3
  const delay = 100
  const drawDelay = 500
  const maxCount = 80
  const color = 'hsla(200, 100%, 80%, 1)'

  const wrap = document.createElement('div')
  wrap.style.position = 'relative'
  wrap.style.padding = '0.5em 1em 0 0'
  wrap.style.width = '160px'
  wrap.style.border = '1px solid hsla(0, 0%, 30%, 0.4)'

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '160')
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('transform', 'scale(1, -1)')
  svg.style.borderBottom = '1px solid hsla(0, 0%, 50%, 0.8)'

  const history = []
  const rects = []

  const boxW = width / maxCount
  for (let i = 0; i < maxCount; i++) {
    let x = i * boxW
    let r = document.createElementNS(svg.namespaceURI, 'rect')
    r.setAttribute('fill', color)
    r.setAttribute('x', x)
    r.setAttribute('height', '0')
    r.setAttribute('width', `${boxW}`)

    rects.push(r)
    svg.appendChild(r)
    history.push(0)
  }

  let text60 = document.createElement('div')
  text60.style.fontFamily = 'monospace'
  text60.style.position = 'absolute'
  text60.style.top = '0'
  text60.style.right = '0'
  text60.innerText = '60'
  wrap.appendChild(text60)

  wrap.appendChild(svg)
  el.appendChild(wrap)

  const draw = throttle(() => {
    history.splice(0, history.length - maxCount)

    for (let i = 0; i < maxCount; i++) {
      let h = rescale(0, 60, history[i] | 0) * height
      rects[i].setAttribute('height', `${h}`)
    }

    text60.innerText = history[history.length - 1].toFixed(0)
  }, drawDelay)

  const update = throttle(fps => {
    history.push(fps)
    draw()
  }, delay)

  return {
    svg,
    update
  }
}



function createLabel($parent, anchor = 'top left') {
  let el = document.createElement('div')
  el.style.position = 'absolute'
  el.style.top = '0'
  el.style.height = '1em'
  el.style.textAlign = 'right'
  el.style.zIndex = '1'

  anchor = anchor.split(' ')

  let ax = 0
  let ay = 0

  if (anchor[0] === 'middle') {
    ay = '-50%'
  } else if (anchor[0] === 'bottom') {
    ay = '-100%'
  }

  if (anchor[1] === 'middle') {
    ax = '-50%'
  } else if (anchor[1] === 'right') {
    ax = '-100%'
  }

  let anchorTransform = `translate(${ax}, ${ay})`

  function move(x, y, fromRight, fromBottom) {
    x = typeof x === 'string' ? x : x + 'px'
    y = typeof y === 'string' ? y : y + 'px'

    let ox = 0
    let oy = 0

    if (fromRight) {
      el.style.right = '0px'
      el.style.left = 'auto'
      ox = '100%'
    } else {
      el.style.left = '0px'
      el.style.right = 'auto'
    }

    if (fromBottom) {
      el.style.bottom = '0px'
      el.style.top = 'auto'
      oy = '100%'
    } else {
      el.style.top = '0px'
      el.style.bottom = 'auto'
    }

    el.style.transform = anchorTransform + ` translate(${ox}, ${oy}) translate(${x}, ${y})`
  }

  function set(html) {
    el.innerHTML = html
  }

  if ($parent) {
    $parent.appendChild(el)
  }

  return {
    el,
    move,
    set
  }
}

function createSlider({
  parent = document.body,
  min = 0,
  max = 1,
  step = 0.1,
  value = 0.5,
  label = '',
  onUpdate = (v, e) => { }
} = {}) {
  const slider = {}

  const $wrap = document.createElement('div')
  $wrap.style.display = 'flex'
  $wrap.style.flexDirection = 'row'

  const $label = document.createElement('label')
  $label.style.paddingRight = '0.5em'
  $label.style.flex = '1'
  $label.style.textAlign = 'right'
  $wrap.appendChild($label)

  const el = document.createElement('input')
  el.type = 'range'
  el.min = min
  el.max = max
  el.step = step
  el.style.flex = '3'
  $wrap.appendChild(el)

  slider.set = (v) => {
    el.value = v
    v = v.toFixed(2)
    $label.innerHTML = label ? `${label}: ${v}` : v
  }

  el.addEventListener('input', e => {
    slider.set(+el.value)
    onUpdate(+el.value)
  })

  slider.set(value)

  slider.el = el

  if (parent) {
    parent.appendChild($wrap)
  }

  return slider
}

function createPlot({
  y,
  x = [0, 1],
  range = 'auto',
  width = 480,
  height,
  parent = document.body
}) {

  height = height || width

  const $wrap = document.createElement('div')
  $wrap.style.display = 'flex'
  $wrap.style.flexDirection = 'column'

  const $plotWrap = document.createElement('div')
  $plotWrap.style.position = 'relative'
  $plotWrap.style.marginBottom = '1.5em'
  $wrap.appendChild($plotWrap)

  const $xGuide = createLabel($plotWrap, 'top middle')
  const $yGuide = createLabel($plotWrap, 'middle right')
  const $mouseGuide = createLabel($plotWrap, 'middle left')

  const { canvas, ctx, clearCanvas, dimensions } = getDrawTools({
    width, height,
    parent: $plotWrap
  })

  let args = [0]
  let domain = x
  let otherVars = false
  if (domain.length) {
    otherVars = domain.slice(1)
    domain = domain[0]
    args = x.map(v => v.length ? v[0] : v)
  }

  let varNames = getFnParameters(y).slice(1)
  if (otherVars && otherVars.length !== varNames.length) {
    throw new Error('Parameters in function do not match number of domain entries')
  }

  const fn = (x) => {
    args[0] = x
    return y.apply(null, args)
  }

  let points = []
  let rangeMin = Infinity
  let rangeMax = -Infinity
  let $x
  let $y

  let sliders = []
  for (let i = 0; i < otherVars.length; i++) {
    let d = otherVars[i]
    if (!d.length) { continue }

    let s = ((i) => createSlider({
      parent: $wrap,
      min: d[0],
      max: d[1],
      value: d[0],
      label: varNames[i],
      onUpdate(v) {
        args[i + 1] = v
        recalc()
        draw()
      }
    }))(i)
    sliders.push(s)
  }

  function recalc() {
    let { width, height } = dimensions
    $x = createScale(domain, [0, width])
    rangeMin = Infinity
    rangeMax = -Infinity

    for (let i = 0; i < width; i++) {
      let x = lerp(domain[0], domain[1], i / width)
      let py = fn(x)
      points[i] = { x, y: py }
      rangeMin = Math.min(py, rangeMin)
      rangeMax = Math.max(py, rangeMax)
    }

    if (range === 'auto') {
      $y = createScale([rangeMin, rangeMax], [height, 0])
    } else {
      $y = createScale(range, [height, 0])
    }

    points.forEach(p => {
      p.x = $x(p.x)
      p.y = $y(p.y)
    })
  }

  const mousePos = { x: 0, y: 0 }
  const guidePoint = { x: 0, y: 0 }

  function draw() {
    let { width, height } = dimensions
    clearCanvas()

    let x = $x.inverse(mousePos.x, true)
    let y = $y.inverse(mousePos.y, true)
    $mouseGuide.set(`${y.toFixed(2)}`)
    $mouseGuide.move(0, mousePos.y, true)

    guidePoint.x = x
    guidePoint.y = fn(x)

    // guides
    let gx = $x(guidePoint.x)
    let gy = $y(guidePoint.y)
    drawLine(ctx, { x: 0, y: gy }, { x: width, y: gy }, 'hsla(0, 0%, 50%, 0.5)', 1)
    drawLine(ctx, { x: gx, y: 0 }, { x: gx, y: height }, 'hsla(0, 0%, 50%, 0.5)', 1)

    $xGuide.set(guidePoint.x.toFixed(2))
    $xGuide.move(gx, 0, false, true)
    $yGuide.set(guidePoint.y.toFixed(2))
    $yGuide.move(0, gy)

    drawLines(ctx, points, 'steelblue', 1)
    drawCircle(ctx, gx, gy, 4, 'steelblue')
  }

  $plotWrap.addEventListener('mousemove', e => {
    let offset = canvas.getBoundingClientRect()
    mousePos.x = e.pageX - offset.left
    mousePos.y = Math.min(height, e.pageY - offset.top)

    draw()
  })

  recalc()
  draw()

  parent.appendChild($wrap)
}