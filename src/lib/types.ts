import { ObjectId } from "mongodb";

export type Role = "coach" | "player" | "scout";

export interface User {
  _id?: ObjectId;
  username: string;
  password: string; // bcrypt hashed
  role: Role;
  name: string;
  playerId?: ObjectId; // only for role "player"
}

export interface Player {
  _id?: ObjectId;
  name: string;
  age: number;
  sport: string;
}

export interface AttendanceEntry {
  playerId: ObjectId;
  status: "present" | "absent";
}

export interface Session {
  _id?: ObjectId;
  date: string;       // YYYY-MM-DD
  sport: string;
  status: "open" | "closed";
  attendance: AttendanceEntry[];
}

export interface ScoreEntry {
  playerId: ObjectId;
  score: number;
}

export interface Match {
  _id?: ObjectId;
  date: string;       // YYYY-MM-DD
  sport: string;
  opponent: string;
  scores: ScoreEntry[];
}

export interface ReadyResult {
  player: Player;
  sessionsHeld: number;
  sessionsPresent: number;
  attendancePct: number;
  matchCount: number;
  isReady: boolean;
}
