function realmDocuments(container, session) {
 const store = networkStore(
  session,
  'system.documents'
 )
 const preferencesStore = networkStore(
  session,
  'system.preferences.documents'
 )
 container.appendChild(
  explorer(store, preferencesStore).element
 )
}
