// ルーム内の参加者の並べ方
import { ROLE_IDS } from './tabRouting.js'

// 参加中（キックされていない）の参加者を参加順に並べる
export const getActiveParticipants = (room) =>
  Object.entries(room?.participants ?? {})
    .filter(([, participant]) => participant?.active)
    .map(([id, participant]) => ({ id, ...participant }))
    .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))

// ホストをA、ほかの参加者を参加順にB～Eへ対応づける。
export const getParticipantRoles = (room) => {
  const participants = getActiveParticipants(room)
  const host = participants.find((participant) => participant.id === room?.hostId)
  const ordered = [host, ...participants.filter((participant) => participant.id !== room?.hostId)].filter(Boolean)
  return Object.fromEntries(ordered.map((participant, index) => [participant.id, ROLE_IDS[index]]))
}

// 列の並び：自分を先頭（「自分」）、ほかの参加者を参加順（「1」～「4」）
export const getColumns = (room, participantId, nickname) => {
  const participants = getActiveParticipants(room)
  const self = participants.find((p) => p.id === participantId) ?? {
    id: participantId,
    nickname,
  }
  const others = participants.filter((p) => p.id !== participantId)

  return { participants, self, others }
}
