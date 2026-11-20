interface RoomPeer {
  context: Record<string, unknown>
  send(data: unknown): unknown
}

const rooms = new Map<string, Set<RoomPeer>>()

export function joinRoom(code: string, peer: RoomPeer): void {
  const peers = rooms.get(code) ?? new Set<RoomPeer>()
  peers.add(peer)
  rooms.set(code, peers)
  peer.context.roomCode = code
}

export function leaveRoom(peer: RoomPeer): void {
  const code = peer.context.roomCode
  if (typeof code !== 'string') return
  const peers = rooms.get(code)
  peers?.delete(peer)
  if (peers?.size === 0) rooms.delete(code)
}

export function broadcast(code: string, event: unknown): void {
  const serialized = JSON.stringify(event)
  for (const peer of rooms.get(code) ?? []) peer.send(serialized)
}
