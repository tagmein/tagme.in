'use strict'
Object.defineProperty(exports, '__esModule', {
 value: true,
})
exports.civilMemoryObjects =
 exports.civilMemoryKV = void 0
var cloudflareKV_1 = require('./kv/cloudflareKV')
var httpKV_1 = require('./kv/httpKV')
var volatileKV_1 = require('./kv/volatileKV')
exports.civilMemoryKV = {
 cloudflare: cloudflareKV_1.cloudflareKV,
 http: httpKV_1.httpKV,
 volatile: volatileKV_1.volatileKV,
}
