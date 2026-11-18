import assert from 'node:assert/strict'
import { pickReceiver } from './expansionRouting.js'

const tabs = ['B', 'C', 'D']
const distribution = { B: 0, C: 0, D: 0 }
const sequence = Array.from({ length: 10 }, (_, cursor) => {
  const receiver = pickReceiver(tabs, cursor)
  distribution[receiver.tabId] += 1
  return receiver.tabId
})

assert.deepEqual(sequence, ['B', 'C', 'D', 'B', 'C', 'D', 'B', 'C', 'D', 'B'])
assert.deepEqual(distribution, { B: 4, C: 3, D: 3 })
assert.equal(pickReceiver(['A'], 9).tabId, 'A')
assert.deepEqual([0, 1, 2].map((cursor) => pickReceiver(['', 'C', 'D'], cursor).tabId), ['C', 'D', 'C'])
assert.equal(pickReceiver([''], 0), null)

console.log('expansion round-robin routing checks passed')
