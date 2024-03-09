function realmRealms(container, session) {
 const store = networkStore(
  session,
  'system.realms'
 )
 const preferencesStore = networkStore(
  session,
  'system.preferences.patterns'
 )
 container.appendChild(
  explorer(store, preferencesStore, {
   itemAction: {
    label: 'Launch',
    handler(item) {
     appAccounts
      .add(
       forkSession(
        session,
        session.realm
         ? extendRealm(session.realm, item.id)
         : `${encodeURIComponent(
            session.email
           )}#${encodeURIComponent(
            JSON.stringify([item.id])
           )}`,
        item.id
       )
      )
      .switchTo()
    },
   },
  }).element
 )
}

function extendRealm(realm, id) {
 const [emailEncoded, idsEncoded] =
  realm.split('#')
 const ids = JSON.parse(
  decodeURIComponent(idsEncoded)
 )
 return `${emailEncoded}#${encodeURIComponent(
  JSON.stringify([...ids, id])
 )}`
}
