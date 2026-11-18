import assert from 'node:assert/strict'
import { getParticipantRoles } from './participants.js'
import { normalizeTabAssignments, receivingTabId, rolesForCapacity } from './tabRouting.js'

const room = {
  hostId: 'person-a',
  capacity: 4,
  participants: {
    'person-d': { joinedAt: 40, active: true },
    'person-b': { joinedAt: 20, active: true },
    'person-a': { joinedAt: 50, active: true },
    'person-c': { joinedAt: 30, active: true },
  },
}

const roles = getParticipantRoles(room)
assert.deepEqual(roles, {
  'person-a': 'A',
  'person-b': 'B',
  'person-c': 'C',
  'person-d': 'D',
})
assert.deepEqual(rolesForCapacity(room.capacity), ['A', 'B', 'C', 'D'])

const tabsByPerson = {
  'person-a': { A: '11', B: '12', C: '13', D: '14' },
  'person-b': { A: '21', B: '22', C: '23', D: '24' },
  'person-c': { A: '31', B: '32', C: '33', D: '34' },
  'person-d': { A: '41', B: '42', C: '43', D: '44' },
}

const targetsFor = (senderId) => Object.keys(tabsByPerson)
  .map((personId) => receivingTabId(tabsByPerson[personId], roles[personId], roles[senderId]))
  .filter((tabId) => tabId !== null)

assert.deepEqual(targetsFor('person-a'), [21, 31, 41])
assert.deepEqual(targetsFor('person-d'), [14, 24, 34])
assert.deepEqual(normalizeTabAssignments({ A: '11', B: '11', C: null, D: 14, E: 'bad' }), { A: '11', D: '14' })

console.log('system A–D tab routing checks passed')
