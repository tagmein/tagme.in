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
 const messageStatusLabel =
  document.createElement('span')
 messageStatusLabel.dataset.value =
  messageStatusLabel.textContent =
   message.statusLabel || 'no status'
 labelsElement.appendChild(messageStatusLabel)
 messageFooter.appendChild(labelsElement)
}

function calculateTopLabel(labelsToCompare) {
 if (typeof labelsToCompare !== 'object') {
  return
 }
 const calculatedScores = Object.entries(
  labelsToCompare
 )
  .filter((x) => x[0].startsWith('status:'))
  .map((x) => {
   return [x[0], calculateScore(x[1])]
  })

 //  console.dir({ calculatedScores })
 return calculatedScores[0]?.[0]?.replace(
  'status:',
  ''
 )
}
