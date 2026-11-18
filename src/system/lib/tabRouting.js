export const ROLE_IDS = ['A', 'B', 'C', 'D', 'E']

export const rolesForCapacity = (capacity) =>
  ROLE_IDS.slice(0, Number.isInteger(capacity) ? capacity : 0)

export const normalizeTabId = (value) => {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  const number = Number(text)
  return /^\d+$/.test(text) && Number.isSafeInteger(number) && number > 0 ? text : ''
}

export const normalizeTabAssignments = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const used = new Set()
  const result = {}
  for (const roleId of ROLE_IDS) {
    const tabId = normalizeTabId(value[roleId])
    if (tabId && !used.has(tabId)) {
      result[roleId] = tabId
      used.add(tabId)
    }
  }
  return result
}

export const receivingTabId = (assignments, ownRoleId, senderRoleId) => {
  if (!ROLE_IDS.includes(ownRoleId) || !ROLE_IDS.includes(senderRoleId) || ownRoleId === senderRoleId) return null
  const tabId = normalizeTabId(assignments?.[senderRoleId])
  return tabId ? Number(tabId) : null
}
