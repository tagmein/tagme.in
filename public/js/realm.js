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
  'discussion',
  'Discussion',
  contents.add((container) =>
   realmDiscussion(container, session)
  ),
  switchToMode('main')
 )
 tabs.add(
  'documents',
  'Documents',
  contents.add((container) =>
   realmDocuments(container, session)
  ),
  switchToMode('other')
 )
 tabs.add(
  'members',
  'Members',
  contents.add((container) =>
   realmMembers(container, session)
  ),
  switchToMode('other')
 )
 tabs.add(
  'patterns',
  'Patterns',
  contents.add((container) =>
   realmPatterns(container, session)
  ),
  switchToMode('other')
 )
 tabs.add(
  'realms',
  'Realms',
  contents.add((container) =>
   realmRealms(container, session)
  ),
  switchToMode('other')
 )
 tabs.add(
  'schedule',
  'Schedule',
  contents.add((container) =>
   realmSchedule(container, session)
  ),
  switchToMode('other')
 )
 tabStripContainer.innerHTML = ''
 await tabs.activate()
 tabStripContainer.appendChild(tabs.element)
 realmControlContainer.appendChild(
  contents.element
 )
}
