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
  _id?: ObjectId | string;
  name: string;
  age: number;
  sport: string;
  username?: string;
  imageUrl?: string | null;
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
  playerId: ObjectId | string;
  score: number;
  playerName?: string;
  coachOverride?: boolean;
}

export interface Match {
  _id?: ObjectId | string;
  date: string;       // YYYY-MM-DD
  sport: string;
  opponent: string;
  outcome?: "win" | "draw" | "loss";
  scores: ScoreEntry[];
  coachOverrides?: string[];
}

export interface ReadyResult {
  player: Player;
  sessionsHeld: number;
  sessionsPresent: number;
  attendancePct: number;
  matchCount: number;
  isReady: boolean;
}
