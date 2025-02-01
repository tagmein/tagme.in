export function cloudflareKV(_a) {
 var binding = _a.binding
 return {
  delete: function (key) {
   return binding.delete(key)
  },
  get: function (key) {
   return binding.get(key)
  },
  set: function (key, value) {
   return binding.put(key, value)
  },
 }
}
