# Academy Desk

Sports academy tracking and trial readiness benchmarking system for Dumka Sports Academy.

### Checkpoints

| Rule | Specification |
|---|---|
| **Session Immutability** | Attendance is locked once closed (`HTTP 400`). |
| **Match Eligibility** | Absent athletes cannot participate in matches (`HTTP 400`). |
| **Trial Readiness** | $\ge 75\%$ attendance and $\ge 2$ matches played. |
| **Role Isolation** | Scouts see only trial-ready athletes; players see only their own dossier. |
| **Multi-Sport** | Strict attendance isolation across concurrent sports on the same date. |

### Credentials

| Role | Login | Route |
|---|---|---|
| **Coach** | `coach` / `coach123` | `/coach` |
| **Scout** | `scout` / `scout123` | `/scout` |
| **Player** | `rohit` / `rohit123` | `/player` |

### Verification

```bash
npm run verify        # 4 core hackathon checks + multi-sport concurrency
npm test              # full 107-test opaque-box E2E suite
npm run build         # production build
```
