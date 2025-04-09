globalThis.STATUS = {
 DENIED: 'denied',
 DONE: 'done',
 IN_PROGRESS: 'in progress',
 IN_REVIEW: 'in review',
 LATER: 'later',
 OPEN: 'open',
 STOPPED: 'stopped',
}

function statusLabel(label) {
 return `status:${label}`
}

const statusLabels = (globalThis.STATUS_LABELS =
 Object.values(globalThis.STATUS).map(
  statusLabel
 ))

const labelsMenu =
 document.createElement('article')

async function renderLabelsMenu(
 channel,
 message,
 labels
) {
 labelsMenu.innerHTML = ''
 const labelsMenuTitle =
  document.createElement('h2')
 labelsMenu.classList.add('message-menu')
 labelsMenuTitle.textContent =
  'Set message label'
 labelsMenu.appendChild(labelsMenuTitle)
 const dismissLabelsMenu =
  document.createElement('button')
 dismissLabelsMenu.textContent =
  'Dismiss Labels View'
 dismissLabelsMenu.addEventListener(
  'click',
  function () {
   labelsMenu.parentElement.removeChild(
    labelsMenu
   )
  }
 )
 labelsMenu.appendChild(dismissLabelsMenu)
 const labelGroups = {}
 //  console.log(
 //   'RENDERING GROUP LABELS::: ' +
 //    labels.join(':::')
 //  )

 for (const label of labels) {
  if (label.includes(':')) {
   const [group] = label.split(':', 1)
   if (!(group in labelGroups)) {
    labelGroups[group] = {
     options: [],
     groupElement:
      document.createElement('section'),
    }
    labelsMenu.appendChild(
     labelGroups[group].groupElement
    )
   }
   //  console.log('Pushing group option label', {
   //   labelGroups,
   //   group,
   //   groupLabel,
   //   label,
   //   labels,
   //  })
   labelGroups[group].options.push(label)
  }
 }

 const messageLabelsChannel = `labels@${encodeURIComponent(
  channel
 )}#${encodeURIComponent(message.text)}`

 const labelsChannelData = await withLoading(
  networkChannelSeek(
   messageLabelsChannel,
   getHourNumber()
  )
 )

 const formattedMessageData = formatMessageData(
  labelsChannelData.response.messages
 )

 for (const [
  groupLabel,
  labelGroup,
 ] of Object.entries(labelGroups)) {
  const { groupElement } = labelGroup
  groupElement.classList.add('label-group')
  labelsMenu.appendChild(groupElement)
  const groupTitle =
   document.createElement('h3')
  groupTitle.textContent = groupLabel
  groupElement.appendChild(groupTitle)
  labelGroup.options.sort()
  let highScore = 0
  let highScoreOption = undefined
  for (const groupLabelOption of labelGroup.options) {
   const matchingOptionMessage =
    formattedMessageData.find((x) => {
     //  console.log({
     //   labelGroup,
     //   formattedMessageData,
     //   groupLabel,
     //   groupLabelOption,
     //   xText: x.text,
     //  })
     return x.text === groupLabelOption
    })
   //  console.log({ matchingOptionMessage })
   const groupLabelOptionMessage =
    matchingOptionMessage ?? {
     data: {
      newsChunk: 0,
      position: 0,
      seen: Date.now(),
      timestamp: Date.now(),
      velocity: 0,
      replies: { count: 0, top: [] },
     },
     text: groupLabelOption,
     score: 0,
    }
   const groupLabelOptionArticle =
    document.createElement('article')
   if (
    groupLabelOptionMessage.score > highScore
   ) {
    highScore = groupLabelOptionMessage.score
    highScoreOption = groupLabelOptionArticle
   }
   groupElement.appendChild(
    groupLabelOptionArticle
   )
   displayChannelArticle(
    groupLabelOptionArticle,
    messageLabelsChannel,
    groupLabelOptionMessage,
    function (x) {
     return x.replace('status:', '')
    }
   )
   groupElement.appendChild(
    groupLabelOptionArticle
   )
  }
  if (highScoreOption) {
   //  console.log(`High score ${highScore}`)
   highScoreOption.dataset.themeBg = 'true'
  }
 }
}

async function labelMessage(
 labelsElement,
 channel,
 message,
 messageFooter,
 isNew,
 allLabels
) {
 if (isNew) {
  messageFooter.appendChild(labelsMenu)
  // console.log({
  //  message,
  //  messageFooter,
  //  isNew,
  //  allLabels,
  // })
  await renderLabelsMenu(
   channel,
   message,
   allLabels
  )
  return
 }
 labelsElement.innerHTML = ''
 message.statusLabel = calculateTopLabel(
  message.data.labels
 )
 message.eventualStatusLabel =
  calculateTopLabel(
   message.data.labels,
   999999999999
  )
 console.log(
  message.statusLabel,
  message.eventualStatusLabel
 )
 const messageStatusLabel =
  document.createElement('span')
 messageStatusLabel.dataset.value =
  messageStatusLabel.textContent =
   message.statusLabel || 'no status'

 if (
  message.eventualStatusLabel !==
  message.statusLabel
 ) {
  messageStatusLabel.classList.add('diff-old')
  const diffArrow =
   document.createElement('span')
  diffArrow.classList.add('diff-arrow')
  const eventualMessageStatusLabel =
   document.createElement('span')
  eventualMessageStatusLabel.classList.add(
   'diff-new'
  )
  eventualMessageStatusLabel.dataset.value =
   eventualMessageStatusLabel.textContent =
    message.eventualStatusLabel || 'no status'

  labelsElement.appendChild(messageStatusLabel)
  labelsElement.appendChild(diffArrow)
  labelsElement.appendChild(
   eventualMessageStatusLabel
  )
  eventualMessageStatusLabel.setAttribute(
   'title',
   `Status ${
    message.eventualStatusLabel
   } in ${prettyDuration(
    calculateTimeToPass(
     message.data.labels[
      statusLabel(message.eventualStatusLabel)
     ],
     message.data.labels[
      statusLabel(message.statusLabel)
     ]
    )
   )}`
  )
 } else {
  labelsElement.appendChild(messageStatusLabel)
 }

 messageFooter.appendChild(labelsElement)
}

function prettyDuration(ms) {
 const years = Math.floor(
  ms / (12 * 30 * 24 * 60 * 60 * 1000)
 )
 ms -= years * (12 * 30 * 24 * 60 * 60 * 1000)
 const months = Math.floor(
  ms / (30 * 24 * 60 * 60 * 1000)
 )
 ms -= months * (30 * 24 * 60 * 60 * 1000)
 const days = Math.floor(
  ms / (24 * 60 * 60 * 1000)
 )
 ms -= days * (24 * 60 * 60 * 1000)
 const hours = Math.floor(ms / (60 * 60 * 1000))
 ms -= hours * (60 * 60 * 1000)
 const minutes = Math.floor(ms / (60 * 1000))
 ms -= minutes * (60 * 1000)
 const seconds = Math.floor(ms / 1000)
 if (years > 0) {
  return `${years}y ${months}m ${days}d ${hours}h ${minutes}m ${seconds}s`
 }
 if (months > 0) {
  return `${months}m ${days}d ${hours}h ${minutes}m ${seconds}s`
 }
 if (days > 0) {
  return `${days}d ${hours}h ${minutes}m ${seconds}s`
 }
 if (hours > 0) {
  return `${hours}h ${minutes}m ${seconds}s`
 }
 if (minutes > 0) {
  return `${minutes}m ${seconds}s`
 }
 return `${seconds}s`
}

function calculateTopLabel(
 labelsToCompare,
 hourToEvaluate
) {
 if (typeof labelsToCompare !== 'object') {
  return
 }
 const calculatedScores = Object.entries(
  labelsToCompare
 )
  .filter((x) => x[0].startsWith('status:'))
  .map((x) => {
   return [
    x[0],
    calculateScore(x[1], hourToEvaluate),
   ]
  })
  .sort((a, b) => b[1] - a[1])
 //  console.dir({
 //   labelsToCompare,
 //   calculatedScores,
 //  })
 return calculatedScores[0]?.[0]?.replace(
  'status:',
  ''
 )
}

function calculateTimeToPass(
 labelData1,
 labelData2
) {
 // Check if input data is valid
 if (
  !labelData1 ||
  !labelData2 ||
  typeof labelData1 !== 'object' ||
  typeof labelData2 !== 'object'
 ) {
  console.warn(
   'Invalid input to calculateTimeToPass',
   { labelData1, labelData2 }
  )
  return Infinity
 }

 const p1 = labelData1.position
 const v1 = labelData1.velocity
 const ts1 = labelData1.timestamp
 const p2 = labelData2.position
 const v2 = labelData2.velocity
 const ts2 = labelData2.timestamp

 // Ensure all necessary properties exist
 if (
  typeof p1 !== 'number' ||
  typeof v1 !== 'number' ||
  typeof ts1 !== 'number' ||
  typeof p2 !== 'number' ||
  typeof v2 !== 'number' ||
  typeof ts2 !== 'number'
 ) {
  console.warn(
   'Missing properties in labelData for calculateTimeToPass',
   { labelData1, labelData2 }
  )
  return Infinity
 }

 // Ensure ONE_HOUR_MS is available (defined in lib.js)
 if (typeof ONE_HOUR_MS === 'undefined') {
  console.error(
   'ONE_HOUR_MS is not defined. Make sure lib.js is loaded first.'
  )
  // Fallback definition, though this indicates a potential issue
  globalThis.ONE_HOUR_MS = 3600 * 1000
 }

 const now = Date.now()

 // Calculate current scores using the logic from lib.js's calculateScore
 const score1Now =
  p1 + (v1 * (now - ts1)) / ONE_HOUR_MS
 const score2Now =
  p2 + (v2 * (now - ts2)) / ONE_HOUR_MS

 // If score1 is already greater than score2, time to pass is 0
 if (score1Now > score2Now) {
  return 0
 }

 // If score1's velocity is not greater than score2's, it will never pass score2
 // (since it's currently not ahead)
 if (v1 <= v2) {
  return Infinity
 }

 // Calculate the time 't' (milliseconds since epoch) when scores are equal:
 // score1(t) = score2(t) => t = ((p2 - p1)*ONE_HOUR_MS + v1*ts1 - v2*ts2) / (v1 - v2)
 const t =
  ((p2 - p1) * ONE_HOUR_MS +
   v1 * ts1 -
   v2 * ts2) /
  (v1 - v2)

 // Calculate time difference from now until 't'
 const timeToPass = t - now

 // Return the time difference in milliseconds, ensuring it's non-negative
 return Math.max(0, timeToPass)
}
