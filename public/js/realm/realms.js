function realmRealms(container, session) {
 const store = networkStore(
  session,
  'system.realms'
 )
 container.appendChild(explorer(store).element)
}
