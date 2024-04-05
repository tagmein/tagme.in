var art = elem({
 tagName: 'div',
 classes: ['art'],
})

var two = new Two({
 type: Two.Types.svg,
}).appendTo(art)

function makePoint(x, y) {
 if (arguments.length <= 1) {
  y = x.y
  x = x.x
 }

 const v = new Two.Anchor(x, y)
 v.position = new Two.Vector().copy(v)
 return v
}

function update(frameCount, timeDelta) {
 for (
  var i = 0;
  i < two.scene.children.length;
  i++
 ) {
  const child = two.scene.children[i]
  for (
   var j = 0;
   j < child.vertices.length;
   j++
  ) {
   const v = child.vertices[j]
   if (!v.position) {
    return
   }
   v.x = v.position.x
   v.y = v.position.y
  }
 }
}

two.bind('update', update)

const mouse = new Two.Vector()
var x, y, line

art.addEventListener('mousedown', (e) => {
 mouse.set(e.clientX, e.clientY)
 line = null

 art.addEventListener('mousemove', drag)
 art.addEventListener('mouseup', dragEnd)
})

function drag(e) {
 x = e.clientX
 y = e.clientY

 if (!line) {
  const v1 = makePoint(mouse)
  const v2 = makePoint(x, y)
  line = two.makeCurve([v1, v2])
  line.noFill()
  line.stroke = '#333'
  line.linewidth = 10
  line.vertices.forEach((v) => {
   v.addSelf(line.translation)
  })
  line.translation.clear()
 } else {
  line.vertices.push(makePoint(x, y))
 }

 mouse.set(x, y)
}

function dragEnd(e) {
 art.removeEventListener('mousemove', drag)
 art.removeEventListener('mouseup', dragEnd)
 two.update()
}

var dot = two.makeCircle(120, 120, 100)
dot.fill = '#52C5DC'
dot.noStroke()

two.update()
