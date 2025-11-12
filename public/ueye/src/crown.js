const BIT = 0
const BRANCH = 1
const DECIMAL = 2
const INTEGER = 3
const TEXT = 4
const BRANCH_LIST = 5
const TAB_LIST = 6

const TypeLabels = {
 [BIT]: 'Bit',
 [BRANCH]: 'Branch',
 [DECIMAL]: 'Decimal',
 [INTEGER]: 'Integer',
 [TEXT]: 'Text',
}

const TypeLabelCounters = {
 [BIT]: 0,
 [BRANCH]: 0,
 [DECIMAL]: 0,
 [INTEGER]: 0,
 [TEXT]: 0,
}

registerUeyeComponent(
 'crown',
 async function (components) {
  return function crown() {
   const tabs = []
   function newTab(type, name) {
    label =
     name ??
     `${TypeLabels[type]} ${TypeLabelCounters[
      type
     ]++}`
    const tab = {
     type,
     label,
     index: tabs.length,
    }
    tabs.push(tab)
    return tab
   }
   const c = {
    types: {
     BIT,
     BRANCH,
     DECIMAL,
     INTEGER,
     TEXT,
    },
    decimal(d, name) {
     return [newTab(DECIMAL, name), d]
    },
    integer(i, name) {
     return [newTab(INTEGER, name), i]
    },
    text(t, name) {
     return [newTab(TEXT, name), t]
    },
    bit(b, name) {
     return [newTab(BIT, name), b]
    },
    branch(name) {
     return [newTab(BRANCH, name), name]
    },
    branches(_search, caseSensitive = false) {
     const search =
      typeof _search === 'string'
       ? caseSensitive
         ? _search
         : _search.toLowerCase()
       : undefined
     const filteredTabs = tabs.filter(
      (x) => x.type === BRANCH
     )
     const results =
      typeof search === 'string'
       ? filteredTabs.filter((x) =>
          (caseSensitive
           ? x.label
           : x.label.toLowerCase()
          ).includes(search)
         )
       : filteredTabs
     return [
      newTab(BRANCH_LIST, search),
      results,
     ]
    },
    tabs(_search, caseSensitive = false) {
     const search =
      typeof _search === 'string'
       ? caseSensitive
         ? _search
         : _search.toLowerCase()
       : undefined
     const results =
      typeof search === 'string'
       ? tabs.filter((x) =>
          (caseSensitive
           ? x.label
           : x.label.toLowerCase()
          ).includes(search)
         )
       : tabs
     return [newTab(TAB_LIST, search), results]
    },
   }
   return c
  }
 }
)
