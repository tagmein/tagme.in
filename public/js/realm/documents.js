function realmDocuments(container, session) {
 const store = networkStore(
  session,
  'system.documents'
 )
 container.appendChild(explorer(store).element)
}
