export const pickReceiver = (tabIds, cursor) => {
  const receivers = tabIds.map((tabId, index) => ({ tabId, index })).filter(({ tabId }) => tabId)
  return receivers.length ? receivers[cursor % receivers.length] : null
}
