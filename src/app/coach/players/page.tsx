"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { CoachNav } from "@/components/coach-nav";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  UserPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Search,
  Loader2,
  UserCheck,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

interface PlayerRecord {
  _id: string;
  name: string;
  age: number;
  sport: string;
  username?: string;
}

const SPORTS_OPTIONS = [
  { value: "cricket", label: "Cricket" },
  { value: "football", label: "Football" },
  { value: "kabaddi", label: "Kabaddi" },
  { value: "other", label: "Other" },
];

export default function CoachPlayersPage() {
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Player State
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAge, setAddAge] = useState<number | string>(16);
  const [addSport, setAddSport] = useState("cricket");
  const [addPassword, setAddPassword] = useState("");

  // Edit Player State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState<number | string>(16);
  const [editSport, setEditSport] = useState("cricket");

  // Delete Player State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState<PlayerRecord | null>(null);

  // Load players from API
  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/players");
      if (!res.ok) {
        throw new Error("Failed to fetch players");
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlayers(data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load players");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  // Open Add Dialog
  const handleOpenAdd = () => {
    setAddName("");
    setAddAge(16);
    setAddSport("cricket");
    setAddPassword("");
    setAddDialogOpen(true);
  };

  // Submit Add Player
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      toast.error("Player name is required");
      return;
    }
    const numAge = Number(addAge);
    if (isNaN(numAge) || numAge <= 0) {
      toast.error("Valid age is required");
      return;
    }
    if (!addPassword) {
      toast.error("Password is required for player login");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          age: numAge,
          sport: addSport,
          password: addPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add player");
      }

      const createdName = data.name || data.player?.name || addName.trim();
      const createdUsername =
        data.username ||
        data.player?.username ||
        createdName.toLowerCase().replace(/\s+/g, "-");

      toast.success(`${createdName} added. Login: ${createdUsername} / ••••••`);

      setAddDialogOpen(false);
      await loadPlayers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create player");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (player: PlayerRecord) => {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditAge(player.age);
    // Normalize sport match
    const foundSport = SPORTS_OPTIONS.find(
      (s) => s.value.toLowerCase() === (player.sport || "").toLowerCase()
    );
    setEditSport(foundSport ? foundSport.value : "cricket");
    setEditDialogOpen(true);
  };

  // Submit Edit Player
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    if (!editName.trim()) {
      toast.error("Player name cannot be empty");
      return;
    }
    const numAge = Number(editAge);
    if (isNaN(numAge) || numAge <= 0) {
      toast.error("Valid age is required");
      return;
    }

    try {
      setIsEditing(true);
      const res = await fetch(`/api/players/${editingPlayer._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          age: numAge,
          sport: editSport,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update player");
      }

      toast.success(`${data.name || editName.trim()} updated successfully`);
      setEditDialogOpen(false);
      await loadPlayers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update player");
    } finally {
      setIsEditing(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (player: PlayerRecord) => {
    setDeletingPlayer(player);
    setDeleteDialogOpen(true);
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deletingPlayer) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/players/${deletingPlayer._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete player");
      }

      toast.success(`${deletingPlayer.name} and login account deleted`);
      setDeleteDialogOpen(false);
      setDeletingPlayer(null);
      await loadPlayers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete player");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter players by search query
  const filteredPlayers = players.filter((p) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = p.name.toLowerCase().includes(q);
    const sportMatch = (p.sport || "").toLowerCase().includes(q);
    const usernameMatch = (p.username || "").toLowerCase().includes(q);
    return nameMatch || sportMatch || usernameMatch;
  });

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50">
      <CoachNav />

      <main className="container mx-auto flex-1 px-4 py-6 sm:px-6 sm:py-8 max-w-6xl">
        {/* Title Bar & Action Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                Players
              </h1>
              <Badge
                variant="outline"
                className="border-zinc-800 bg-zinc-900/60 text-zinc-400 font-mono text-xs"
              >
                {players.length} registered
              </Badge>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Manage academy athletes and their automated login credentials.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleOpenAdd}
              className="gap-2 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-semibold cursor-pointer shadow-xs"
            >
              <UserPlus className="size-4" />
              <span>Add Player</span>
            </Button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="mt-6 mb-4 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, sport, or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Players Data Table */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
              <Loader2 className="size-6 animate-spin text-zinc-300" />
              <p className="text-xs font-mono">Loading academy roster...</p>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 mb-3">
                <Users className="size-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">
                {searchQuery ? "No matching players found" : "No players yet"}
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4">
                {searchQuery
                  ? "Try adjusting your search query to find the athlete."
                  : "Add players to the academy roster. They will automatically receive login credentials."}
              </p>
              {!searchQuery && (
                <Button
                  onClick={handleOpenAdd}
                  size="sm"
                  variant="outline"
                  className="gap-2 border-zinc-800 hover:bg-zinc-800"
                >
                  <UserPlus className="size-3.5" />
                  <span>Add First Player</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-zinc-800/80 hover:bg-transparent">
                    <TableHead className="min-w-[180px] sm:w-[260px] text-zinc-400 font-medium text-xs">
                      Athlete
                    </TableHead>
                    <TableHead className="text-zinc-400 font-medium text-xs">
                      Login Username
                    </TableHead>
                    <TableHead className="text-zinc-400 font-medium text-xs">
                      Age
                    </TableHead>
                    <TableHead className="text-zinc-400 font-medium text-xs">
                      Sport
                    </TableHead>
                    <TableHead className="text-right text-zinc-400 font-medium text-xs w-[80px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => {
                    const initials = player.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    const fallbackUsername = player.name
                      .toLowerCase()
                      .replace(/\s+/g, "-");
                    const displayUsername = player.username || fallbackUsername;

                    return (
                      <TableRow
                        key={player._id}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                      >
                        <TableCell className="py-3 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 font-mono text-xs font-semibold text-zinc-200">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-sm text-zinc-100 block truncate">
                                {player.name}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono block">
                                ID: {player._id.slice(-6)}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-300">
                            <KeyRound className="size-3 text-zinc-500" />
                            <span className="bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300">
                              {displayUsername}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 text-xs text-zinc-300 font-mono">
                          {player.age} yrs
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className="capitalize border-zinc-700/80 bg-zinc-800/60 text-zinc-200 text-[11px] font-normal"
                          >
                            {player.sport}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36 bg-zinc-950 border-zinc-800 text-zinc-200">
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(player)}
                                className="gap-2 cursor-pointer text-xs"
                              >
                                <Pencil className="size-3.5 text-zinc-400" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleOpenDelete(player)}
                                className="gap-2 cursor-pointer text-xs text-red-400 hover:text-red-300 focus:text-red-300"
                              >
                                <Trash2 className="size-3.5" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* ==================================================== */}
      {/* ADD PLAYER MODAL                                     */}
      {/* ==================================================== */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-zinc-100">
              Add New Player
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Register a new academy athlete. A linked user login account will be automatically created.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit}>
            <div className="space-y-4 px-6 pt-2 pb-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Name <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Ravi"
                  required
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Age <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  value={addAge}
                  onChange={(e) => setAddAge(e.target.value)}
                  min={5}
                  max={50}
                  required
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Sport <span className="text-red-400">*</span>
                </label>
                <Select
                  value={addSport}
                  onValueChange={(val) => {
                    if (val) setAddSport(val);
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 justify-between">
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {SPORTS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Becomes login password
                  </span>
                </div>
                <Input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="e.g. ravi123"
                  required
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500"
                />
              </div>

              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3 text-[11px] text-zinc-400 flex items-start gap-2">
                <ShieldCheck className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  Username will be auto-generated from player name (e.g.{" "}
                  <code className="text-zinc-200">
                    {addName.trim()
                      ? addName.trim().toLowerCase().replace(/\s+/g, "-")
                      : "player-name"}
                  </code>
                  ).
                </span>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 gap-2">
              <DialogClose
                type="button"
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-semibold text-xs cursor-pointer gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="size-3.5" />
                    <span>Add Player</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* EDIT PLAYER MODAL                                    */}
      {/* ==================================================== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-zinc-100">
              Edit Player
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Update details for athlete {editingPlayer?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 px-6 pt-2 pb-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Name <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Age <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  min={5}
                  max={50}
                  required
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 block">
                  Sport <span className="text-red-400">*</span>
                </label>
                <Select
                  value={editSport}
                  onValueChange={(val) => {
                    if (val) setEditSport(val);
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-zinc-100 justify-between">
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {SPORTS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 gap-2">
              <DialogClose
                type="button"
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                disabled={isEditing}
                className="bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-semibold text-xs cursor-pointer gap-2"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="size-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================================================== */}
      {/* DELETE PLAYER CONFIRMATION DIALOG                     */}
      {/* ==================================================== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-400 flex items-center gap-2">
              <Trash2 className="size-4" />
              <span>Delete Player</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 pt-1">
              Are you sure you want to remove{" "}
              <strong className="text-zinc-200">{deletingPlayer?.name}</strong>?
              This will permanently delete the player document and their associated user login account.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="px-6 pb-6 pt-4 gap-2">
            <DialogClose
              type="button"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs cursor-pointer gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  <span>Confirm Delete</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
