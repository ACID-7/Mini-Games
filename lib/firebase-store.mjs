const rooms = new Map();

function normalizeCode(code) {
  return String(code || "").toUpperCase();
}

export function createFirebaseStore() {
  return {
    async getRoom(code) {
      return rooms.get(normalizeCode(code)) || null;
    },
    async saveRoom(room) {
      rooms.set(normalizeCode(room.code), room);
    },
    async deleteRoom(code) {
      rooms.delete(normalizeCode(code));
    },
    async roomExists(code) {
      return rooms.has(normalizeCode(code));
    },
  };
}
