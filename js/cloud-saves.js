// Cloud save helpers using WebsimSocket records
import { room } from './main.js';
import { serializeState, loadStateData } from './game-state.js';

const COLLECTION = 'save_v2';

async function currentUsername() {
  const u = await window.websim.getCurrentUser();
  return u?.username || room.peers[room.clientId]?.username || 'anon';
}

export async function saveSlotCloud(slot = 1) {
  const username = await currentUsername();
  const list = room.collection(COLLECTION).filter({ slot, username }).getList();
  const existing = Array.isArray(list) && list[0];
  const payload = { slot, data: serializeState(), username };
  if (existing) await room.collection(COLLECTION).update(existing.id, payload);
  else await room.collection(COLLECTION).create(payload);
  return true;
}

export async function loadSlotCloud(slot = 1) {
  const username = await currentUsername();
  const list = room.collection(COLLECTION).filter({ slot, username }).getList();
  const rec = Array.isArray(list) && list[0];
  if (!rec || !rec.data) return false;
  loadStateData(rec.data);
  return true;
}

export async function loadLatestCloud() {
  const username = await currentUsername();
  const list = room.collection(COLLECTION).filter({ username }).getList();
  const rec = Array.isArray(list) && list[0];
  if (!rec || !rec.data) return false;
  loadStateData(rec.data);
  return true;
}
