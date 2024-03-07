function realmPatterns(container, session) {
 const store = networkStore(
  session,
  'system.patterns'
 )
 container.appendChild(explorer(store).element)
}
