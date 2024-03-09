function realmPatterns(container, session) {
 const store = networkStore(
  session,
  'system.patterns'
 )
 const preferencesStore = networkStore(
  session,
  'system.preferences.realms'
 )
 container.appendChild(
  explorer(store, preferencesStore).element
 )
}
