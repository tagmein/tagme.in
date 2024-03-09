async function renderRealm(
 realmControlContainer,
 sessionId
) {
 const session = readSession(sessionId)
 const preferences = networkStore(
  session,
  'system.preferences'
 )
 const tabs = tabStrip(
  (await preferences.get('realm.tab'))?.value,
  (value) =>
   preferences.patch('realm.tab', {
    value,
   })
 )
 const contents = tabContents()
 tabs.add(
  'members',
  'Members',
  contents.add((container) =>
   realmMembers(container, session)
  )
 )
 tabs.add(
  'realms',
  'Realms',
  contents.add((container) =>
   realmRealms(container, session)
  )
 )
 tabs.add(
  'patterns',
  'Patterns',
  contents.add((container) =>
   realmPatterns(container, session)
  )
 )
 tabs.add(
  'documents',
  'Documents',
  contents.add((container) =>
   realmDocuments(container, session)
  )
 )
 await tabs.activate()
 realmControlContainer.appendChild(tabs.element)
 realmControlContainer.appendChild(
  contents.element
 )
}
