function renderRealm(
 realmControlContainer,
 sessionId
) {
 const session = readSession(sessionId)
 const tabs = tabStrip()
 const contents = tabContents()
 tabs.add(
  'Members',
  contents.add((container) =>
   realmMembers(container, session)
  )
 )
 tabs.add(
  'Realms',
  contents.add((container) =>
   realmRealms(container, session)
  )
 )
 tabs.add(
  'Patterns',
  contents.add((container) =>
   realmPatterns(container, session)
  )
 )
 tabs.add(
  'Documents',
  contents.add((container) =>
   realmDocuments(container, session)
  )
 )
 realmControlContainer.appendChild(tabs.element)
 realmControlContainer.appendChild(
  contents.element
 )
}
