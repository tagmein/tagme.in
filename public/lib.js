function addTextWithLinks(container, text) {
 const parts = text.split(/(https?:\/\/[^\s]+)/)
 parts.forEach((part) => {
  if (/^https?:\/\//.test(part)) {
   const a = document.createElement('a')
   a.setAttribute('target', '_blank')
   a.setAttribute('href', part)
   a.textContent = part
   container.appendChild(a)
  } else if (part) {
   container.appendChild(
    document.createTextNode(part)
   )
  }
 })
}

function addYouTubeEmbed(container, text) {
 const regExp =
  /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
 const match = text.match(regExp)

 if (match && match[2].length == 11) {
  const id = match[2]
  const frame = document.createElement('iframe')
  frame.setAttribute('width', '560')
  frame.setAttribute('height', '315')
  frame.setAttribute('frameborder', '0')
  frame.setAttribute(
   'src',
   `//www.youtube.com/embed/${id}`
  )
  frame.setAttribute(
   'allowfullscreen',
   'allowfullscreen'
  )
  container.appendChild(frame)
 }
}

function addImageEmbed(container, text) {
 const regExp =
  /https:\/\/\S+\.(gif|jpe?g|png|webp)/
 const match = text.match(regExp)

 if (match) {
  const imageContainer = elem({
   classes: ['image-container'],
   children: [
    elem({
     attributes: {
      src: match[0],
     },
     tagName: 'img',
    }),
   ],
   events: {
    click() {
     if (
      imageContainer.classList.contains(
       'expanded'
      )
     ) {
      imageContainer.classList.remove(
       'expanded'
      )
     } else {
      imageContainer.classList.add('expanded')
     }
    },
   },
  })
  container.appendChild(imageContainer)
 }
}

function begin2024GMT() {
 return new Date('January 1, 2024 00:00:00 GMT')
}

function dateTimeSelector(setHour) {
 const yearSelect = elem({
  events: {
   input() {
    resetDayOptions()
    modify()
   },
  },
  tagName: 'select',
 })

 const monthSelect = elem({
  events: {
   input() {
    resetDayOptions()
    modify()
   },
  },
  tagName: 'select',
 })

 const daySelect = elem({
  events: {
   input() {
    modify()
   },
  },
  tagName: 'select',
 })

 const hourSelect = elem({
  children: 'aaaaaaaaaaaapppppppppppp'
   .split('')
   .map((ap, i) =>
    elem({
     attributes: {
      value: i,
     },
     tagName: 'option',
     textContent: `${
      ap === 'a'
       ? i === 0
         ? 12
         : i
       : i === 12
       ? 12
       : i - 12
     }${ap}m`,
    })
   ),
  events: {
   input() {
    modify()
   },
  },
  tagName: 'select',
 })

 for (let year = 2024; year < 2049; year++) {
  yearSelect.appendChild(
   elem({
    attributes: {
     value: year,
    },
    tagName: 'option',
    textContent: year.toString(10),
   })
  )
 }

 const monthNames =
  'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(
   ' '
  )
 for (let month = 0; month < 12; month++) {
  monthSelect.appendChild(
   elem({
    attributes: {
     value: month,
    },
    tagName: 'option',
    textContent: monthNames[month],
   })
  )
 }

 function resetDayOptions() {
  const currentDayValue = parseInt(
   daySelect.value,
   10
  )
  const daysInMonth = getDaysInMonth(
   parseInt(yearSelect.value, 10),
   parseInt(monthSelect.value, 10)
  )
  daySelect.innerHTML = ''
  for (let day = 0; day < daysInMonth; day++) {
   daySelect.appendChild(
    elem({
     attributes: {
      value: day,
     },
     tagName: 'option',
     textContent: (day + 1).toString(10),
    })
   )
  }
  daySelect.value = isNaN(currentDayValue)
   ? '0'
   : Math.min(
      daysInMonth - 1,
      currentDayValue
     ).toString(10)
 }

 resetDayOptions()

 function update(hourNumber) {
  const [y, m, d, h] = getDateTime(hourNumber)
  yearSelect.value = y.toString(10)
  monthSelect.value = m.toString(10)
  resetDayOptions()
  daySelect.value = d.toString(10)
  hourSelect.value = h.toString(10)
 }

 function modify() {
  setHour(
   hoursSinceStartOf2024(
    ...[
     yearSelect,
     monthSelect,
     daySelect,
     hourSelect,
    ].map((s) => parseInt(s.value, 10))
   )
  )
 }

 return [
  yearSelect,
  monthSelect,
  daySelect,
  hourSelect,
  update,
 ]
}

function debounce(fn, delay = 500) {
 let timeout
 return function () {
  clearTimeout(timeout)
  timeout = setTimeout(fn, delay)
 }
}

function describeHourNumber(hourNumber) {
 const date = new Date(
  begin2024GMT().getTime() + hourNumber * 3600e3
 )
 return date
  .toLocaleString()
  .replace(/\:\d\d\:\d\d /, '')
  .split(', ')
}

function elem({
 attributes,
 classes,
 children,
 events,
 tagName = 'div',
 textContent,
} = {}) {
 const e = document.createElement(tagName)
 if (attributes) {
  for (const [k, v] of Object.entries(
   attributes
  )) {
   e.setAttribute(k, v)
  }
 }
 if (events) {
  for (const [k, v] of Object.entries(events)) {
   e.addEventListener(k, v)
  }
 }
 if (classes) {
  for (const c of classes) {
   e.classList.add(c)
  }
 }
 if (textContent) {
  e.textContent = textContent
 }
 if (children) {
  for (const c of children) {
   e.appendChild(c)
  }
 }
 return e
}

function getDateTime(hoursSince2024) {
 const resultDate = new Date(
  begin2024GMT().getTime() +
   hoursSince2024 * 60 * 60 * 1000
 )
 return [
  resultDate.getFullYear(),
  resultDate.getMonth(),
  resultDate.getDate() - 1,
  resultDate.getHours(),
 ]
}

function getDaysInMonth(year, month) {
 const months30 = [3, 5, 8, 10]
 const feb = 1

 if (months30.includes(month)) {
  return 30
 }

 if (month === feb) {
  if (
   year % 4 === 0 &&
   (year % 100 !== 0 || year % 400 === 0)
  )
   return 29
  return 28
 }

 return 31
}

function getHourNumber() {
 const now = new Date()
 const msPerHour = 1000 * 60 * 60
 return Math.floor(
  (now.getTime() - begin2024GMT().getTime()) /
   msPerHour
 )
}

function getUrlData() {
 const [_, channel, hour] = window.location.hash
  .split('/')
  .map((x) =>
   typeof x === 'string'
    ? decodeURIComponent(x)
    : undefined
  )
 return {
  channel: channel ?? '',
  hour:
   typeof hour === 'string'
    ? parseInt(hour, 10)
    : getHourNumber(),
 }
}

function hoursSinceStartOf2024(
 year,
 month,
 day,
 hour
) {
 const startDate = begin2024GMT()

 const date = new Date(
  year,
  month,
  day + 1,
  hour
 )

 return Math.floor(
  (date - startDate) / (1000 * 60 * 60)
 )
}

async function networkChannelSeek(
 channel,
 hour
) {
 const response = await fetch(
  `${networkRootUrl()}/seek?channel=${encodeURIComponent(
   channel
  )}&hour=${hour}`
 )
 if (!response.ok) {
  throw new Error(
   `${
    response.statusText
   }: ${await response.text()}`
  )
 }
 return response.json()
}

async function networkMessageDelete(
 channel,
 message
) {
 const resp = await fetch(
  `${networkRootUrl()}/send`,
  {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({
    channel,
    message,
    delete: true,
   }),
  }
 )

 if (!resp.ok) {
  throw new Error(await resp.text())
 }

 return await resp.text()
}

async function networkMessageSend(
 channel,
 message
) {
 const resp = await fetch(
  `${networkRootUrl()}/send`,
  {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json',
   },
   body: JSON.stringify({
    channel,
    message,
   }),
  }
 )

 if (!resp.ok) {
  throw new Error(await resp.text())
 }

 return await resp.text()
}

function networkRootUrl() {
 return location.origin ===
  'http://localhost:8000'
  ? 'https://tagme.in'
  : ''
}

function setChannel(channel) {
 const { hour } = getUrlData()
 location.hash = `#/${encodeURIComponent(
  channel
 )}/${hour}`
}

function setHour(hour) {
 const { channel } = getUrlData()
 location.hash = `#/${encodeURIComponent(
  channel
 )}/${Math.max(0, hour)}`
}
