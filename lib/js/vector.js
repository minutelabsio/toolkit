///////////////////////////////////////////
// MinuteLabs.io Vector Library
// author: Jasper Palfree (info@minutelabs.io)
// For educational use.
// Copyright 2020 Jasper Palfree
// License: GPLv3
///////////////////////////////////////////

function _drawArrow(ctx, x, y, length, angle, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(length, 0)
  ctx.stroke()
  ctx.lineTo(length - 6, 6)
  ctx.lineTo(length - 6, -6)
  ctx.lineTo(length, 0)
  ctx.fill()
  ctx.restore()
}

class Vector {
  constructor(x = 0, y = 0) {
    this.set(x, y)
  }

  clone() {
    return new Vector(this.x, this.y)
  }

  // set this vector to have the values of another vector
  copy(v) {
    return this.set(v.x, v.y)
  }

  set(x, y) {
    this.x = x
    this.y = y
    return this
  }

  add(other) {
    this.x += other.x
    this.y += other.y
    return this
  }

  plus(other) {
    return this.clone().add(other)
  }

  subtract(other) {
    this.x -= other.x
    this.y -= other.y
    return this
  }

  minus(other) {
    return this.clone().subtract(other)
  }

  multiply(number) {
    this.x *= number
    this.y *= number
    return this
  }

  times(number) {
    return this.clone().multiply(number)
  }

  divide(number) {
    this.x /= number
    this.y /= number
    return this
  }

  dividedBy(number) {
    return this.clone().divide(number)
  }

  normSq() {
    return this.x * this.x + this.y * this.y
  }

  norm() {
    return Math.sqrt(this.normSq())
  }

  setNorm(n) {
    let norm = this.norm()
    if (norm === 0) {
      norm = 1
      this.x = 1
      this.y = 0
    }
    n /= norm
    this.x *= n
    this.y *= n
    return this
  }

  normalize() {
    return this.setNorm(1)
  }

  angle() {
    return Math.atan2(this.y, this.x)
  }

  setAngle(angle) {
    let n = this.norm()
    if (n === 0) {
      n = 1
      this.x = 1
      this.y = 0
    }
    this.x = n * Math.cos(angle)
    this.y = n * Math.sin(angle)
    return this
  }

  rotateBy(angle) {
    return this.setAngle(this.angle() + angle)
  }

  dot(vector) {
    return this.x * vector.x + this.y * vector.y
  }

  proj(vector) {
    let other = vector.clone().normalize()
    return other.multiply(this.dot(other))
  }

  projScalar(vector) {
    return this.dot(vector) / vector.norm()
  }

  clampedProj(vector) {
    let n = vector.norm()
    let other = vector.clone().normalize()
    return other.multiply(Math.min(n, Math.max(0, this.dot(other))))
  }

  clamp(min, max) {
    this.x = Math.max(min.x, Math.min(max.x, this.x))
    this.y = Math.max(min.y, Math.min(max.y, this.y))
    return this
  }

  // perform a reflection with specified normal vector to the mirror
  reflect(normal) {
    let n = normal.normSq()
    return this.subtract(normal.times(2 * this.dot(normal) / n))
  }

  // return a new vector that is the reflection along normal
  reflection(normal) {
    return this.copy().reflect(normal)
  }

  randomize(n = 1) {
    return this.setNorm(n).setAngle(2 * Math.PI * Math.random())
  }

  // Draws this vector to a canvas context
  debugDraw(ctx, offset = null, scale = 1, withComponents = false, color = 'white') {
    let angle = this.angle()
    let n = scale * this.norm()
    let ox = offset ? offset.x : 0
    let oy = offset ? offset.y : 0
    if (withComponents) {
      // _drawArrow(ctx, ox, oy + this.y * scale, scale * this.x, 0, 'red')
      // _drawArrow(ctx, ox, oy, scale * this.y, Math.PI / 2, 'yellow')
      ctx.save()
      ctx.strokeStyle = 'tomato'
      ctx.translate(ox, oy)
      ctx.beginPath()
      let y = scale * this.y
      ctx.moveTo(0, y)
      ctx.lineTo(scale * this.x, y)
      ctx.stroke()
      ctx.strokeStyle = 'gold'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, y)
      ctx.stroke()
      ctx.restore()
    }
    _drawArrow(ctx, ox, oy, n, angle, color)
  }
}

function V(x, y) {
  return new Vector(x, y)
}