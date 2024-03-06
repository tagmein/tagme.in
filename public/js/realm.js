function renderRealm(
 realmControlContainer,
 sessionId
) {
 const tabs = tabStrip()
 const contents = tabContents()
 tabs.add(
  'Realms',
  contents.add(
   (elem) => (elem.textContent = 'Realms')
  )
 )
 tabs.add(
  'Fields',
  contents.add(
   (elem) => (elem.textContent = 'Fields')
  )
 )
 tabs.add(
  'Values',
  contents.add(
   (elem) => (elem.textContent = 'Values')
  )
 )
 realmControlContainer.appendChild(tabs.element)
 realmControlContainer.appendChild(
  contents.element
 )
 const session = readSession(sessionId)
 console.log({ session })
}
