var art = elem({
 tagName: 'div',
 classes: ['art'],
})

var two = new Two({
 type: Two.Types.svg,
 width: '100%',
 height: '100%',
}).appendTo(art)

function sanitizeX(x) {
 return x - art.getBoundingClientRect().left
}

function sanitizeY(y) {
 return y - art.getBoundingClientRect().top
}

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
 mouse.set(
  sanitizeX(e.clientX),
  sanitizeY(e.clientY)
 )
 line = null

 art.addEventListener('mousemove', drag)
 art.addEventListener('mouseup', dragEnd)
})

function drag(e) {
 x = sanitizeX(e.clientX)
 y = sanitizeY(e.clientY)

 if (!line) {
  line = two.makeCurve(
   makePoint(mouse),
   makePoint(x, y)
  )
  line.fill = '#000'
  line.stroke = '#000'
  line.linewidth = 2
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
