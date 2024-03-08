function realmRealms(container, session) {
 const store = networkStore(
  session,
  'system.realms'
 )
 container.appendChild(
  explorer(store, {
   itemAction: {
    label: 'Launch',
    handler(item) {
     console.log({ session, item })
    },
   },
  }).element
 )
}
