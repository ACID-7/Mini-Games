import { initializeApp, getApps } from 'firebase/app';
import { get, getDatabase, ref, remove, set } from 'firebase/database';

const ROOM_COLLECTION = 'partyFusionRooms';

function normalizeCode(code) {
  return String(code || '').toUpperCase();
}

function roomPath(code) {
  return `${ROOM_COLLECTION}/${normalizeCode(code)}`;
}

function getFirebaseConfig() {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDsTWyyGbiKqrfwhgyfp0564eZnlMeD5qw',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'minigames-ee135.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'minigames-ee135',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'minigames-ee135.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '1069282770394',
    appId: process.env.FIREBASE_APP_ID || '1:1069282770394:web:2b15dbde005d0ee64314e3',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-Q7T76F9PWF'
  };

  return config.projectId ? config : null;
}

export function createFirebaseStore() {
  const config = getFirebaseConfig();
  if (!config) throw new Error('Firebase config is missing.');

  const app = getApps()[0] || initializeApp(config);
  const db = getDatabase(app);

  return {
    async getRoom(code) {
      const snapshot = await get(ref(db, roomPath(code)));
      return snapshot.exists() ? snapshot.val() : null;
    },
    async saveRoom(room) {
      await set(ref(db, roomPath(room.code)), room);
    },
    async deleteRoom(code) {
      await remove(ref(db, roomPath(code)));
    },
    async roomExists(code) {
      const snapshot = await get(ref(db, roomPath(code)));
      return snapshot.exists();
    }
  };
}
