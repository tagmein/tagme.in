const SCRIPT_CHANNEL = '𝓢'
const SCRIPT_PREFIX = '𝓢@'
const MAX_SCRIPT_PREVIEW_LENGTH = 100

// Add this near the top, after the constants
let isDisplayingScripts = false

/**
 * Renders the menu for installing/uninstalling scripts for the current channel.
 * Fetches available scripts from the '𝓢' channel and current installations
 * from the '𝓢@channel' channel.
 * @param {string} channel - The current channel name.
 * @param {HTMLElement} container - The DOM element to append the menu to.
 */
async function renderScriptsMenu(
 channel,
 container
) {
 // --- Remove previous menu if exists ---
 const existingMenu = container.querySelector(
  '.message-menu'
 )
 if (existingMenu) {
  existingMenu.remove()
 }

 // --- Create Menu Structure ---
 const menu = elem({
  tagName: 'article',
  classes: ['message-menu', 'script-menu'],
  children: [
   elem({
    tagName: 'h2',
    textContent: 'Manage Channel Scripts',
   }),
   // Scripts will be added here
   elem({
    tagName: 'button',
    textContent: 'Dismiss Scripts View',
    events: {
     click: () => menu.remove(),
    },
   }),
  ],
 })
 container.appendChild(menu)
 const scriptsContainer = elem({
  classes: ['script-menu-list'],
 })
 // Insert scripts container before the dismiss button
 menu.insertBefore(
  scriptsContainer,
  menu.lastChild
 )

 // --- Fetch Data ---
 const installedScriptsChannel = `${SCRIPT_PREFIX}${encodeURIComponent(
  channel
 )}`
 const [allScriptsData, installedScriptsData] =
  await Promise.all([
   withLoading(
    networkChannelSeek(
     SCRIPT_CHANNEL,
     getHourNumber(),
     true
    )
   ), // Fetch all scripts
   withLoading(
    networkChannelSeek(
     installedScriptsChannel,
     getHourNumber()
    )
   ), // Fetch installed for this channel
  ])

 // --- Error Handling ---
 if (
  !allScriptsData ||
  'error' in allScriptsData ||
  typeof allScriptsData?.response?.messages !==
   'object'
 ) {
  console.error(
   `Error seeking script channel: ${SCRIPT_CHANNEL}`,
   allScriptsData?.error ?? allScriptsData
  )
  scriptsContainer.textContent =
   'Error loading available scripts.'
  return
 }
 if (
  !installedScriptsData ||
  'error' in installedScriptsData ||
  typeof installedScriptsData?.response
   ?.messages !== 'object'
 ) {
  console.error(
   `Error seeking installed scripts channel: ${installedScriptsChannel}`,
   installedScriptsData?.error ??
    installedScriptsData
  )
  // Non-fatal, proceed with empty installed map
 }

 // --- Process Data ---
 const allScripts = formatMessageData(
  allScriptsData.response.messages
 )
 const installedScriptsMap = new Map(
  formatMessageData(
   installedScriptsData?.response?.messages ??
    {}
  ).map((msg) => [msg.text, msg]) // map by script preview text
 )

 // --- Render Scripts ---
 if (allScripts.length === 0) {
  scriptsContainer.textContent =
   'No scripts available in the 𝓢 channel yet.'
  return
 }

 allScripts.sort((a, b) => b.score - a.score) // Sort available scripts by global score

 for (const script of allScripts) {
  const scriptPreview = script.text.substring(
   0,
   MAX_SCRIPT_PREVIEW_LENGTH
  )
  const installedData = installedScriptsMap.get(
   scriptPreview
  )
  const currentScore = installedData?.score ?? 0
  const currentVelocity =
   installedData?.data?.velocity ?? 0

  // --- Build DOM structure mirroring attachMessage -> news > article ---

  // Display global script score (from '𝓢' channel)
  const globalScoreElement = elem({
   classes: ['global-script-score'],
   textContent: niceNumber(script.score),
   attributes: {
    title: `Global script score: ${script.score}`,
   },
  })

  // Display script preview (maybe format better later)
  const previewElement = elem({
   tagName: 'pre',
   textContent: scriptPreview,
  })
  previewElement.title = script.text // Show full script on hover

  // Score and Voting buttons (similar to attachMessage)
  const agreeButton = elem({
   classes: [
    'agree',
    ...(currentVelocity > 0 ? ['agreed'] : []),
   ], // Highlight if velocity is positive
   children: [icon('yes')],
   attributes: {
    title:
     'Install/Promote this script on this channel',
   },
   tagName: 'button',
   events: {
    async click() {
     const newVelocity = Math.min(
      currentVelocity + 1,
      10
     )
     if (
      (await withLoading(
       networkMessageSend(
        installedScriptsChannel,
        scriptPreview,
        newVelocity
       )
      )) !== false
     ) {
      // Optimistically update UI (or re-render menu)
      renderScriptsMenu(channel, container)
     }
    },
   },
  })

  const disagreeButton = elem({
   classes: [
    'disagree',
    ...(currentVelocity < 0
     ? ['disagreed']
     : []),
   ], // Highlight if velocity is negative
   children: [icon('no')],
   attributes: {
    title:
     'Demote/Uninstall this script from this channel',
   },
   tagName: 'button',
   events: {
    async click() {
     const newVelocity = Math.max(
      currentVelocity - 1,
      -10
     )
     if (
      (await withLoading(
       networkMessageSend(
        installedScriptsChannel,
        scriptPreview,
        newVelocity
       )
      )) !== false
     ) {
      // Optimistically update UI (or re-render menu)
      renderScriptsMenu(channel, container)
     }
    },
   },
  })

  const scoreElement = elem({
   classes: ['score'],
   textContent: `${niceNumber(currentScore)}`,
  })
  if (currentVelocity !== 0) {
   scoreElement.appendChild(
    elem({
     classes: ['velocity'],
     textContent: ` ${
      currentVelocity > 0 ? '+' : ''
     }${currentVelocity}/hr`,
    })
   )
  }
  scoreElement.title = `Installed score: ${currentScore}` // Tooltip for exact score

  const toolButtons = elem({
   classes: ['article-tool-buttons'],
   children: [agreeButton, disagreeButton],
  })
  const tools = elem({
   classes: ['article-tools'],
   children: [scoreElement, toolButtons],
  })

  // Mimic the structure inside attachMessage
  const articleContent = elem({
   children: [previewElement],
  }) // Container for the <pre>
  const article = elem({
   tagName: 'article',
   children: [articleContent, tools],
  })

  // Add global score to the article, perhaps before the tools
  article.insertBefore(
   globalScoreElement,
   tools
  )

  // Create the outer .news item container
  const newsItem = elem({
   classes: ['news', 'script-menu-item'], // Use both classes for styling hooks
   children: [article],
  })
  // -----------------------------------------------------------------

  scriptsContainer.appendChild(newsItem) // Append the new structure
 }
}

/**
 * Fetches installed scripts, executes them, and displays their output.
 * @param {string} channel - The current channel name.
 * @param {HTMLElement} targetContainer - The DOM element to insert the output reel before.
 */
async function displayInstalledScripts(
 channel,
 targetContainer // Note: This parameter seems unused as the global scriptOutputReelContainer is always targeted.
) {
 // Prevent concurrent executions
 if (isDisplayingScripts) {
  console.warn(
   'displayInstalledScripts called while already running. Skipping.'
  )
  return
 }
 isDisplayingScripts = true

 try {
  // Use the globally defined scriptOutputReelContainer from main.js
  // Clear the existing content of the persistent reel container
  scriptOutputReelContainer.innerHTML = ''

  const installedScriptsChannel = `${SCRIPT_PREFIX}${encodeURIComponent(
   channel
  )}`
  // Make sure to await the async call
  const installedScriptsData =
   await withLoading(
    networkChannelSeek(
     installedScriptsChannel,
     getHourNumber()
    )
   )

  if (
   !installedScriptsData ||
   'error' in installedScriptsData ||
   typeof installedScriptsData?.response
    ?.messages !== 'object'
  ) {
   console.error(
    `Error seeking installed scripts channel: ${installedScriptsChannel}`,
    installedScriptsData?.error ??
     installedScriptsData
   )
   // No need to explicitly set flag false here, finally handles it
   return
  }

  const installedScriptMessages =
   formatMessageData(
    installedScriptsData.response.messages
   ).filter((msg) => msg.score > 0) // Only consider installed scripts (score > 0)

  if (installedScriptMessages.length === 0) {
   // No need to explicitly set flag false here, finally handles it
   return // No installed scripts
  }

  // Fetch all scripts from the main '𝓢' channel
  const allScriptsData = await withLoading(
   networkChannelSeek(
    SCRIPT_CHANNEL,
    getHourNumber(),
    true
   ) // Use seekMessages equivalent (true flag might indicate full message fetch if available, or use appropriate method)
  )

  if (
   !allScriptsData ||
   'error' in allScriptsData ||
   typeof allScriptsData?.response?.messages !==
    'object'
  ) {
   console.error(
    `Error seeking script channel: ${SCRIPT_CHANNEL}`,
    allScriptsData?.error ?? allScriptsData
   )
   // No need to explicitly set flag false here, finally handles it
   return
  }

  const allScriptMessages = formatMessageData(
   allScriptsData.response.messages
  )

  // Create a map for quick lookup of full script text
  const fullScriptMap = new Map(
   allScriptMessages.map((msg) => [
    msg.text.substring(
     0,
     MAX_SCRIPT_PREVIEW_LENGTH
    ),
    msg.text,
   ])
  )

  // Sort installed scripts by score (descending)
  installedScriptMessages.sort(
   (a, b) => b.score - a.score
  )

  for (const installedScript of installedScriptMessages) {
   const scriptPreview = installedScript.text // This is the preview text (first 100 chars)
   const fullScriptText = fullScriptMap.get(
    scriptPreview
   )

   if (fullScriptText) {
    const outputCard = elem({
     classes: ['script-output-card'],
     style: {
      width: '360px',
      height: '240px',
      padding: '10px',
      borderRadius: '10px',
      border: '2px solid #80808080',
      margin: '5px', // Add some margin for spacing in the reel
      overflow: 'auto', // Add scroll for overflow
     },
    })

    try {
     const scriptResult = runScript(
      fullScriptText,
      channel
     ) // Pass channel context

     if (typeof scriptResult === 'string') {
      outputCard.textContent = scriptResult
     } else if (
      scriptResult instanceof Element
     ) {
      outputCard.appendChild(scriptResult)
     } else if (scriptResult !== undefined) {
      outputCard.textContent = `Script returned non-renderable type: ${typeof scriptResult}`
     }
     // If scriptResult is undefined, card remains empty
    } catch (error) {
     console.error(
      `Error executing script:\n${fullScriptText}\n`,
      error
     )
     outputCard.textContent = `Script Error: ${error.message}`
     outputCard.style.color = 'red'
     outputCard.style.whiteSpace = 'pre-wrap' // Show error details
    }

    scriptOutputReelContainer.appendChild(
     outputCard
    ) // Append card to the persistent container
   } else {
    console.warn(
     `Full script not found for preview: ${scriptPreview}`
    )
   }
  }

  // No need to insert the reel, it's already in the DOM
 } catch (error) {
  // Catch potential errors during the async operations or processing
  console.error(
   'Error during displayInstalledScripts:',
   error
  )
 } finally {
  // Ensure the flag is always reset, even if errors occur or we return early
  isDisplayingScripts = false
 }
}

/**
 * Executes a script string using eval.
 * @param {string} scriptText - The JavaScript code to execute.
 * @param {string} channel - The current channel context passed to the script.
 * @returns {string | Element | undefined} - The result of the script execution.
 */
function runScript(scriptText, channel) {
 // Basic context for the script
 const scriptContext = {
  channel: channel,
  elem: elem, // Provide elem utility
  icon: icon, // Provide icon utility
  networkChannelSeek: networkChannelSeek, // Provide network utility (use with caution)
  // Add other safe utilities as needed
 }

 // Using Function constructor instead of direct eval for slightly better scoping,
 // but still insecure.
 // The script can access global scope (window).
 const scriptFunction = new Function(
  'context',
  `
        const { channel, elem, icon, networkChannelSeek } = context;
        try {
            return (function() {
                ${scriptText}
            })();
        } catch (e) {
            console.error('Error within script execution:', e);
            throw e; // Re-throw to be caught by displayInstalledScripts
        }
    `
 )

 return scriptFunction(scriptContext)
}
