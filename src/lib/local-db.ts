import { ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import { SEED_PLAYERS, SEED_USERS } from "./seed-data";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "academy-desk.json");

interface LocalStore {
  users: any[];
  players: any[];
  sessions: any[];
  matches: any[];
}

function getInitialStore(): LocalStore {
  return {
    players: SEED_PLAYERS.map((p) => ({
      _id: p._id,
      name: p.name,
      age: p.age,
      sport: p.sport,
      imageUrl: p.imageUrl,
    })),
    users: SEED_USERS.map((u) => ({ ...u })),
    sessions: [],
    matches: [],
  };
}

let memoryStore: LocalStore | null = null;

function loadStore(): LocalStore {
  if (memoryStore) return memoryStore;

  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      // Re-hydrate ObjectIds
      const rehydrate = (docs: any[]) =>
        (docs || []).map((d) => {
          if (d._id && typeof d._id === "string") {
            try {
              d._id = new ObjectId(d._id);
            } catch {}
          }
          if (d.playerId && typeof d.playerId === "string") {
            try {
              d.playerId = new ObjectId(d.playerId);
            } catch {}
          }
          if (Array.isArray(d.attendance)) {
            d.attendance = d.attendance.map((a: any) => ({
              ...a,
              playerId: typeof a.playerId === "string" ? new ObjectId(a.playerId) : a.playerId,
            }));
          }
          if (Array.isArray(d.scores)) {
            d.scores = d.scores.map((s: any) => ({
              ...s,
              playerId: typeof s.playerId === "string" ? new ObjectId(s.playerId) : s.playerId,
            }));
          }
          return d;
        });

      memoryStore = {
        users: rehydrate(parsed.users),
        players: rehydrate(parsed.players),
        sessions: rehydrate(parsed.sessions),
        matches: rehydrate(parsed.matches),
      };
      return memoryStore;
    }
  } catch (err) {
    console.warn("Could not load local db file, initializing fresh store:", err);
  }

  memoryStore = getInitialStore();
  saveStore();
  return memoryStore;
}

function saveStore() {
  if (!memoryStore) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch {
    // Non-blocking in read-only or restricted environments
  }
}

function matchDoc(doc: any, query: any): boolean {
  if (!query || Object.keys(query).length === 0) return true;

  for (const [key, expected] of Object.entries(query)) {
    if (key === "$or" && Array.isArray(expected)) {
      if (!expected.some((subQuery) => matchDoc(doc, subQuery))) return false;
      continue;
    }

    const actual = doc[key];

    if (expected instanceof RegExp) {
      if (typeof actual !== "string" || !expected.test(actual)) return false;
    } else if (expected && typeof expected === "object" && "$in" in expected && Array.isArray(expected.$in)) {
      const inList = expected.$in;
      const matched = inList.some((item: any) => {
        if (actual instanceof ObjectId || item instanceof ObjectId) {
          return actual?.toString() === item?.toString();
        }
        return actual === item;
      });
      if (!matched) return false;
    } else if (expected && typeof expected === "object" && "$nin" in expected && Array.isArray(expected.$nin)) {
      const ninList = expected.$nin;
      const matched = ninList.some((item: any) => {
        if (actual instanceof ObjectId || item instanceof ObjectId) {
          return actual?.toString() === item?.toString();
        }
        return actual === item;
      });
      if (matched) return false;
    } else if (expected && typeof expected === "object" && "$exists" in expected) {
      const exists = Boolean(expected.$exists);
      const actualExists = actual !== undefined;
      if (actualExists !== exists) return false;
    } else if (expected && typeof expected === "object" && "$regex" in expected) {
      const exp = expected as any;
      const reg = exp.$regex instanceof RegExp ? exp.$regex : new RegExp(exp.$regex, exp.$options);
      if (typeof actual !== "string" || !reg.test(actual)) return false;
    } else if (actual instanceof ObjectId || expected instanceof ObjectId) {
      if (actual?.toString() !== expected?.toString()) return false;
    } else if (actual !== expected) {
      return false;
    }
  }
  return true;
}

export class LocalCollection {
  private colName: keyof LocalStore;

  constructor(colName: keyof LocalStore) {
    this.colName = colName;
  }

  private getDocs(): any[] {
    const store = loadStore();
    if (!store[this.colName]) {
      store[this.colName] = [];
    }
    return store[this.colName];
  }

  find(query: any = {}) {
    const docs = this.getDocs().filter((d) => matchDoc(d, query));
    const sortedDocs = [...docs];

    return {
      sort(sortObj: Record<string, 1 | -1>) {
        const entries = Object.entries(sortObj);
        if (entries.length > 0) {
          sortedDocs.sort((a, b) => {
            for (const [sortKey, sortDir] of entries) {
              const valA = a[sortKey]?.toString() ?? "";
              const valB = b[sortKey]?.toString() ?? "";
              if (valA < valB) return sortDir === 1 ? -1 : 1;
              if (valA > valB) return sortDir === 1 ? 1 : -1;
            }
            return 0;
          });
        }
        return this;
      },
      async toArray() {
        return JSON.parse(JSON.stringify(sortedDocs)).map((d: any) => {
          if (d._id) d._id = new ObjectId(d._id);
          if (d.playerId) d.playerId = new ObjectId(d.playerId);
          if (Array.isArray(d.attendance)) {
            d.attendance = d.attendance.map((a: any) => ({
              ...a,
              playerId: new ObjectId(a.playerId),
            }));
          }
          if (Array.isArray(d.scores)) {
            d.scores = d.scores.map((s: any) => ({
              ...s,
              playerId: new ObjectId(s.playerId),
            }));
          }
          return d;
        });
      },
    };
  }

  async findOne(query: any = {}) {
    const doc = this.getDocs().find((d) => matchDoc(d, query));
    if (!doc) return null;
    const cloned = JSON.parse(JSON.stringify(doc));
    if (cloned._id) cloned._id = new ObjectId(cloned._id);
    if (cloned.playerId) cloned.playerId = new ObjectId(cloned.playerId);
    if (Array.isArray(cloned.attendance)) {
      cloned.attendance = cloned.attendance.map((a: any) => ({
        ...a,
        playerId: new ObjectId(a.playerId),
      }));
    }
    if (Array.isArray(cloned.scores)) {
      cloned.scores = cloned.scores.map((s: any) => ({
        ...s,
        playerId: new ObjectId(s.playerId),
      }));
    }
    return cloned;
  }

  async insertOne(doc: any) {
    const docs = this.getDocs();
    const inserted = {
      ...doc,
      _id: doc._id instanceof ObjectId ? doc._id : new ObjectId(),
    };
    docs.push(inserted);
    saveStore();
    return { insertedId: inserted._id };
  }

  async insertMany(docsToAdd: any[]) {
    const docs = this.getDocs();
    const insertedIds: Record<number, ObjectId> = {};
    docsToAdd.forEach((doc, idx) => {
      const inserted = {
        ...doc,
        _id: doc._id instanceof ObjectId ? doc._id : new ObjectId(),
      };
      docs.push(inserted);
      insertedIds[idx] = inserted._id;
    });
    saveStore();
    return { insertedIds };
  }

  async updateOne(filter: any, update: any, options: { upsert?: boolean } = {}) {
    const docs = this.getDocs();
    const idx = docs.findIndex((d) => matchDoc(d, filter));

    if (idx >= 0) {
      if (update.$set) {
        Object.assign(docs[idx], update.$set);
      }
      saveStore();
      return { modifiedCount: 1, matchedCount: 1 };
    } else if (options.upsert) {
      const newDoc = {
        ...filter,
        ...(update.$set || {}),
        _id: new ObjectId(),
      };
      docs.push(newDoc);
      saveStore();
      return { modifiedCount: 0, matchedCount: 0, upsertedId: newDoc._id };
    }
    return { modifiedCount: 0, matchedCount: 0 };
  }

  async deleteOne(filter: any = {}) {
    const store = loadStore();
    const docs = store[this.colName] || [];
    const idx = docs.findIndex((d) => matchDoc(d, filter));
    if (idx >= 0) {
      docs.splice(idx, 1);
      saveStore();
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter: any = {}) {
    const store = loadStore();
    const originalLen = (store[this.colName] || []).length;
    store[this.colName] = (store[this.colName] || []).filter((d) => !matchDoc(d, filter));
    const deletedCount = originalLen - store[this.colName].length;
    saveStore();
    return { deletedCount };
  }

  async countDocuments(filter: any = {}) {
    return this.getDocs().filter((d) => matchDoc(d, filter)).length;
  }
}

export class LocalDb {
  collection(name: string): LocalCollection {
    return new LocalCollection(name as keyof LocalStore);
  }

  async command(_cmd?: any) {
    void _cmd;
    return { ok: 1 };
  }
}

export function getLocalDb(): LocalDb {
  return new LocalDb();
}
