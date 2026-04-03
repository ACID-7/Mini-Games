import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "..", "rooms.json");

const rooms = new Map();

async function loadRooms() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(data);
    for (const [key, value] of Object.entries(parsed)) {
      rooms.set(key, value);
    }
  } catch (err) {
    // File doesn't exist or invalid, start empty
  }
}

async function saveRooms() {
  const data = Object.fromEntries(rooms);
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function normalizeCode(code) {
  return String(code || "").toUpperCase();
}

export function createFirebaseStore() {
  loadRooms(); // Load on startup

  return {
    async getRoom(code) {
      return rooms.get(normalizeCode(code)) || null;
    },
    async saveRoom(room) {
      rooms.set(normalizeCode(room.code), room);
      await saveRooms();
    },
    async deleteRoom(code) {
      rooms.delete(normalizeCode(code));
      await saveRooms();
    },
    async roomExists(code) {
      return rooms.has(normalizeCode(code));
    },
  };
}
