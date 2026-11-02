# Academy Desk

A simple sports desk for One Academy. Coaches track daily practice and matches, qualifying athletes for scout trials.

### How It Works

| Rule | What it does |
|---|---|
| **Locked Sessions** | Once a practice session is marked closed, its attendance cannot be altered. |
| **Match Eligibility** | If a player was absent for practice on match day, they cannot play that match. |
| **Trial Qualification** | A player becomes trial-ready after reaching **75% attendance** and playing **at least 2 matches**. |
| **Private Portals** | Scouts only see players who qualified for trials. Players only see their own progress. |

### Demo Accounts

| Role | Login | Page |
|---|---|---|
| **Coach** | `coach` / `coach123` | `/coach` |
| **Scout** | `scout` / `scout123` | `/scout` |
| **Player** | `rohit` / `rohit123` | `/player` |

### Commands

```bash
npm run dev     # start local server at http://localhost:3000
npm run verify  # check all academy rules and edge cases
npm test        # run the full test suite (107 tests)
npm run build   # build production app
```
