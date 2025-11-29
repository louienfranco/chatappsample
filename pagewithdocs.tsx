"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  memo,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Sticker,
  Copy,
  Check,
  User,
  Compass,
  Plus,
  Menu,
  X,
  Home,
  Send,
  Bell,
  Shield,
  UserCog,
  ChevronDown,
  Palette,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  GripVertical,
  UserSearch,
  ArrowLeft,
  LogOut,
} from "lucide-react";

import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/theme/mode-toggle";
import MDFormatting from "@/components/chat/MDFormatting";
import Docs from "@/components/docs/Docs";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

// Types
type Role = "user" | "bot";
type SectionId = "profile" | "explore" | "empty" | "create-workspace" | string;
type DialogType = "rename" | "delete" | "add-member" | "leave" | "logout";
type PresenceStatus = "online" | "busy" | "dnd";

interface Message {
  id: string;
  role: Role;
  text: string;
  time: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
  status: "online" | "offline";
}

interface Workspace {
  id: string;
  code: string;
  name: string;
  messages: Message[];
  starred?: boolean;
  color?: string;
  members?: Member[];
}

// Constants
const DESKTOP_BP = 768;
const HEADER_HEIGHT = "h-12";

const COLORS = [
  { name: "green", bg: "bg-green-500" },
  { name: "blue", bg: "bg-blue-500" },
  { name: "purple", bg: "bg-purple-500" },
  { name: "pink", bg: "bg-pink-500" },
  { name: "orange", bg: "bg-orange-500" },
] as const;

type ColorName = (typeof COLORS)[number]["name"];

const COLOR_MAP: Record<
  ColorName,
  { dot: string; activeBg: string; activeText: string }
> = {
  green: {
    dot: "bg-green-500",
    activeBg: "bg-green-500/10",
    activeText: "text-green-700 dark:text-green-300",
  },
  blue: {
    dot: "bg-blue-500",
    activeBg: "bg-blue-500/10",
    activeText: "text-blue-700 dark:text-blue-300",
  },
  purple: {
    dot: "bg-purple-500",
    activeBg: "bg-purple-500/10",
    activeText: "text-purple-700 dark:text-purple-300",
  },
  pink: {
    dot: "bg-pink-500",
    activeBg: "bg-pink-500/10",
    activeText: "text-pink-700 dark:text-pink-300",
  },
  orange: {
    dot: "bg-orange-500",
    activeBg: "bg-orange-500/10",
    activeText: "text-orange-700 dark:text-orange-300",
  },
} as const;

// Utils
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const now = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const generateWorkspaceCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result.toUpperCase();
};

const getColor = (name?: string) => {
  const key = (name as ColorName) ?? "green";
  return COLOR_MAP[key]?.dot ?? COLOR_MAP.green.dot;
};

const getWorkspaceColorClasses = (name?: string) => {
  const key = (name as ColorName) ?? "green";
  const c = COLOR_MAP[key] ?? COLOR_MAP.green;
  return { bg: c.activeBg, text: c.activeText };
};

// Avatar
function Avatar({
  name,
  size = "md",
  variant = "user",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  variant?: "user" | "bot";
}) {
  const sizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-14 w-14 text-lg",
  };
  const gradients = {
    user: "from-violet-500 to-purple-600",
    bot: "from-emerald-400 to-green-500",
  };
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ${sizes[size]} ${gradients[variant]}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Nav Item
function NavItem({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary shadow-sm"
          : "bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-md ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {children}
      </span>

      <span className="truncate">{label}</span>

      {active && (
        <span
          aria-hidden="true"
          className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
        />
      )}
    </button>
  );
}

// Workspace Item
function WorkspaceItem({
  ws,
  active,
  onClick,
  onOptions,
  optionsOpen,
}: {
  ws: Workspace;
  active: boolean;
  onClick: () => void;
  onOptions: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  optionsOpen: boolean;
}) {
  const { bg, text } = getWorkspaceColorClasses(ws.color);

  return (
    <div
      className="group relative flex items-center gap-1 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="flex h-5 w-5 items-center justify-center text-muted-foreground/60 group-hover:text-muted-foreground">
        <GripVertical size={14} />
      </span>

      <button
        onClick={onClick}
        className={`flex flex-1 items-center gap-2 rounded-lg py-2 pl-2 pr-8 text-sm transition-colors ${
          active
            ? `${bg} ${text} shadow-sm`
            : "bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white ${getColor(
            ws.color
          )}`}
        >
          {ws.name.charAt(0).toUpperCase()}
        </span>
        <span className="flex-1 truncate">{ws.name}</span>
        {ws.starred && (
          <Star size={12} className="fill-yellow-500 text-yellow-500" />
        )}
      </button>

      <button
        onClick={onOptions}
        className={`absolute right-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground ${
          optionsOpen ? "bg-accent" : ""
        }`}
      >
        <MoreHorizontal size={14} />
      </button>
    </div>
  );
}

// Options Dropdown
function OptionsDropdown({
  ws,
  pos,
  onClose,
  onAction,
}: {
  ws: Workspace;
  pos: { top: number; left: number };
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", esc as unknown as EventListener);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", esc as unknown as EventListener);
    };
  }, [onClose]);

  const items = [
    { key: "rename", icon: Pencil, label: "Rename" },
    { key: "star", icon: Star, label: ws.starred ? "Unstar" : "Star" },
    { key: "delete", icon: Trash2, label: "Delete", danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[9999] w-32 rounded-lg border bg-popover p-1 shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => {
            onAction(item.key);
            onClose();
          }}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
            item.danger
              ? "text-destructive hover:bg-destructive/10"
              : "hover:bg-accent"
          }`}
        >
          <item.icon size={14} />
          {item.label}
        </button>
      ))}
    </div>
  );
}

// Empty State
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <MessageCircle size={40} className="text-muted-foreground/40" />
      <h2 className="mt-4 font-semibold">No workspace yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create your first workspace to start chatting.
      </p>
      <Button onClick={onCreate} className="mt-4 gap-2" size="sm">
        <Plus size={16} /> Create Workspace
      </Button>
    </div>
  );
}

// Create Workspace
function CreateWorkspace({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<ColorName>("green");
  const [joinCode, setJoinCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) onCreate(name.trim(), color);
  };

  const handleJoinSubmit = (e: FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    toast.success("Successfully joined");
    setJoinCode("");
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* CREATE WORKSPACE */}
        <div>
          <h1 className="text-xl font-semibold">Create Workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize your conversations by project or topic.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="mb-2 text-xs text-muted-foreground">Preview</p>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white ${getColor(
                    color
                  )}`}
                >
                  {name.trim().charAt(0).toUpperCase() || "W"}
                </div>
                <div className="flex flex-col">
                  <p className="font-medium">
                    {name.trim() || "Workspace Name"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Workspace ID will be generated automatically
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Project Alpha"
                maxLength={50}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="mt-2 flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setColor(c.name)}
                    className={`h-8 w-8 rounded-full ${c.bg} ${
                      color === c.name
                        ? "ring-2 ring-foreground ring-offset-2"
                        : "hover:scale-110"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()} className="flex-1">
                Create
              </Button>
            </div>
          </form>
        </div>

        {/* JOIN WORKSPACE */}
        <div className="border-t pt-4">
          <h2 className="text-sm font-semibold">Join Workspace</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter a workspace ID (e.g.,{" "}
            <span className="font-mono">ABC123</span>) to join an existing one.
          </p>
          <form
            onSubmit={handleJoinSubmit}
            className="mt-3 flex items-center gap-2"
          >
            <input
              value={joinCode}
              onChange={(e) =>
                setJoinCode(e.target.value.toUpperCase().slice(0, 6))
              }
              placeholder="ABC123"
              maxLength={6}
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs font-mono uppercase tracking-widest outline-none focus:border-primary"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={!joinCode.trim()}
            >
              Join
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Dialogs
function RenameDialog({
  ws,
  onRename,
  onClose,
}: {
  ws: Workspace;
  onRename: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(ws.name);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.focus();
      ref.current?.select();
    }, 0);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) onRename(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs rounded-xl border bg-background p-4">
        <h2 className="font-semibold">Rename Workspace</h2>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input
            ref={ref}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({
  ws,
  onConfirm,
  onClose,
}: {
  ws: Workspace;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs rounded-xl border bg-background p-4">
        <h2 className="font-semibold">Delete Workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Delete &quot;{ws.name}&quot;? This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// Leave Workspace Dialog
function LeaveDialog({
  ws,
  onConfirm,
  onClose,
}: {
  ws: Workspace;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs rounded-xl border bg-background p-4">
        <h2 className="font-semibold">Leave Workspace</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to leave &quot;{ws.name}&quot;? You will lose
          access to its messages.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
}

// Logout Dialog
function LogoutDialog({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs rounded-xl border bg-background p-4">
        <h2 className="font-semibold">Log out</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to log out? You can sign back in at any time.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}

// Add Member Dialog
function AddMemberDialog({
  ws,
  onAdd,
  onClose,
}: {
  ws: Workspace;
  onAdd: (username: string) => void;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.focus();
    }, 0);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = username.trim().replace(/^@+/, "");
    if (!cleaned) return;
    onAdd(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs rounded-xl border bg-background p-4">
        <h2 className="font-semibold">Add Member</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite a username to &quot;{ws.name}&quot;.
        </p>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium">
              Username <span className="text-destructive">*</span>
            </label>
            <div className="mt-1">
              <InputGroup>
                <InputGroupInput
                  id="username"
                  ref={ref}
                  value={username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setUsername(e.target.value)
                  }
                  placeholder="shadcn"
                  className="text-sm"
                />
                <InputGroupAddon>
                  <Label
                    htmlFor="username"
                    className="text-xs text-muted-foreground"
                  >
                    @
                  </Label>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!username.trim()}>
              Add
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Profile Section with shadcn Select + "Soon" badges + extra bottom spacing
function ProfileSection({ onRequestLogout }: { onRequestLogout: () => void }) {
  const [status, setStatus] = useState<PresenceStatus>("online");

  const settings = [
    {
      icon: UserCog,
      label: "Account",
      desc: "Basic account information",
    },
    {
      icon: Shield,
      label: "Security",
      desc: "Password & 2‑factor authentication",
    },
    {
      icon: Bell,
      label: "Notifications",
      desc: "Email & in‑app alerts",
    },
    {
      icon: Palette,
      label: "Appearance",
      desc: "Theme & display preferences",
    },
  ];

  const statusLabelMap: Record<PresenceStatus, string> = {
    online: "Online",
    busy: "Busy",
    dnd: "DND",
  };

  const statusStyles: Record<
    PresenceStatus,
    { dot: string; bg: string; text: string }
  > = {
    online: {
      dot: "bg-emerald-500",
      bg: "bg-emerald-500/10",
      text: "text-emerald-600",
    },
    busy: {
      dot: "bg-amber-500",
      bg: "bg-amber-500/10",
      text: "text-amber-600",
    },
    dnd: {
      dot: "bg-red-500",
      bg: "bg-red-500/10",
      text: "text-red-600",
    },
  };

  const currentStatusLabel = statusLabelMap[status];
  const currentStatusStyle = statusStyles[status];

  const handleLogoutClick = () => {
    onRequestLogout();
  };

  return (
    <div
      className="h-full overflow-y-auto bg-muted/30 p-4 md:p-6
                 [scrollbar-gutter:stable]
                 [scrollbar-width:thin]
                 [scrollbar-color:rgba(148,163,184,0.15)_transparent]
                 [&::-webkit-scrollbar]:w-1.5
                 [&::-webkit-scrollbar-track]:bg-transparent
                 [&::-webkit-scrollbar-track-piece]:bg-transparent
                 [&::-webkit-scrollbar-corner]:bg-transparent
                 [&::-webkit-scrollbar-button]:hidden
                 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15
                 [&::-webkit-scrollbar-thumb]:rounded-full"
    >
      {/* pb-10 so content never touches the bottom */}
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 pb-10 lg:flex-row lg:gap-6">
        {/* LEFT COLUMN – profile summary */}
        <div className="w-full max-w-md space-y-4 mx-auto lg:max-w-sm lg:mx-0 lg:shrink-0">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="h-20 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <div className="relative px-4 pb-4">
              <div className="absolute -top-8 left-4">
                <div className="rounded-full">
                  <div className="rounded-full border-4 border-card bg-card">
                    <Avatar name="You" size="lg" />
                  </div>
                </div>
              </div>

              <div className="pt-10">
                <h1 className="text-base font-semibold">You</h1>
                <p className="text-sm text-muted-foreground">you@example.com</p>
                <p
                  className={[
                    "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                    "text-[10px] font-medium",
                    currentStatusStyle.bg,
                    currentStatusStyle.text,
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      currentStatusStyle.dot,
                    ].join(" ")}
                  />
                  {currentStatusLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 text-sm shadow-sm">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">
              Account overview
            </h2>
            <dl className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs text-muted-foreground">Display name</dt>
                <dd className="text-xs font-medium text-foreground">You</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="text-xs font-medium text-foreground">
                  {currentStatusLabel}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-xs text-muted-foreground">
                  Workspaces joined
                </dt>
                <dd className="text-xs font-medium text-foreground">—</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase text-destructive">
              Danger zone
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Logging out will sign you out of qPal on this device.
            </p>
            <Button
              type="button"
              onClick={handleLogoutClick}
              variant="outline"
              className="mt-3 flex w-full items-center justify-center gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <LogOut size={14} />
              <span className="text-xs font-semibold">Log out</span>
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN – settings sections */}
        <div className="flex-1 w-full max-w-md space-y-4 mx-auto lg:max-w-none">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Profile</h1>
              <p className="text-sm text-muted-foreground">
                Manage your account, security, and preferences.
              </p>
            </div>
          </div>

          {/* Profile details */}
          <section className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Profile details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              This information is visible to people you collaborate with.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Display name
                </label>
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                  You
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                  you@example.com
                </div>
              </div>

              {/* STATUS DROPDOWN (shadcn Select) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as PresenceStatus)}
                >
                  <SelectTrigger className="h-8 w-full rounded-lg border bg-muted/40 px-3 text-xs focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="dnd">DND</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Settings list with "Soon" badges */}
          {/* mb-6 gives extra gap below the last card */}
          <section className="mb-6 rounded-2xl border bg-card p-3 shadow-sm">
            <h2 className="px-1 text-sm font-semibold">Settings</h2>
            <div className="mt-2 space-y-1">
              {settings.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="group relative flex w-full items-center gap-3 rounded-xl px-2 py-2.5 pr-14 text-left hover:bg-accent/60"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                    <s.icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>

                  {/* "Soon" badge aligned to the right */}
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Soon
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Members Panel (sidebar on lg+)
function MembersPanel({
  ws,
  onRequestAddMember,
  onRequestLeaveWorkspace,
}: {
  ws: Workspace;
  onRequestAddMember: (wsId: string) => void;
  onRequestLeaveWorkspace: (wsId: string) => void;
}) {
  const members = ws.members ?? [];

  const handleAddClick = () => {
    onRequestAddMember(ws.id);
  };

  const handleLeaveClick = () => {
    onRequestLeaveWorkspace(ws.id);
  };

  return (
    <div className="hidden h-full w-64 flex-col border-l bg-muted/20 p-3 lg:flex">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Members
        </span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {members.length}
          </span>
          <button
            type="button"
            onClick={handleAddClick}
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <Plus size={10} />
          </button>
        </div>
      </div>
      <div
        className="flex-1 space-y-2 overflow-y-auto
                   [scrollbar-gutter:stable]
                   [scrollbar-width:thin]
                   [scrollbar-color:rgba(148,163,184,0.15)_transparent]
                   [&::-webkit-scrollbar]:w-1.5
                   [&::-webkit-scrollbar-track]:bg-transparent
                   [&::-webkit-scrollbar-track-piece]:bg-transparent
                   [&::-webkit-scrollbar-corner]:bg-transparent
                   [&::-webkit-scrollbar-button]:hidden
                   [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15
                   [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        {members.map((m) => {
          const isCurrentUser = m.name === "You";

          return (
            <div
              key={m.id}
              className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5"
            >
              <Avatar name={m.name} size="sm" />
              <div className="flex-1">
                <p className="text-xs font-medium">{m.name}</p>
                <p className="text-[10px] text-muted-foreground">{m.role}</p>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    m.status === "online"
                      ? "bg-green-500"
                      : "bg-muted-foreground/40"
                  }`}
                />
                {isCurrentUser && (
                  <button
                    type="button"
                    onClick={handleLeaveClick}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-red-500 hover:bg-red-500/10"
                    aria-label="Leave workspace"
                    title="Leave workspace"
                  >
                    <LogOut size={10} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Full-width Members view (mobile)
function MembersMainSection({
  ws,
  onBack,
  onRequestAddMember,
  onRequestLeaveWorkspace,
}: {
  ws: Workspace;
  onBack: () => void;
  onRequestAddMember: (wsId: string) => void;
  onRequestLeaveWorkspace: (wsId: string) => void;
}) {
  const members = ws.members ?? [];

  const handleAddClick = () => {
    onRequestAddMember(ws.id);
  };

  const handleLeaveClick = () => {
    onRequestLeaveWorkspace(ws.id);
  };

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex ${HEADER_HEIGHT} items-center justify-between border-b px-4`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="Back to chat"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-semibold">Members · {ws.name}</span>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-3
                   [scrollbar-gutter:stable]
                   [scrollbar-width:thin]
                   [scrollbar-color:rgba(148,163,184,0.15)_transparent]
                   [&::-webkit-scrollbar]:w-1.5
                   [&::-webkit-scrollbar-track]:bg-transparent
                   [&::-webkit-scrollbar-track-piece]:bg-transparent
                   [&::-webkit-scrollbar-corner]:bg-transparent
                   [&::-webkit-scrollbar-button]:hidden
                   [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15
                   [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Members
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {members.length}
              </span>
              <button
                type="button"
                onClick={handleAddClick}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
                aria-label="Add member"
              >
                <Plus size={10} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {members.map((m) => {
              const isCurrentUser = m.name === "You";

              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5"
                >
                  <Avatar name={m.name} size="sm" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        m.status === "online"
                          ? "bg-green-500"
                          : "bg-muted-foreground/40"
                      }`}
                    />
                    {isCurrentUser && (
                      <button
                        type="button"
                        onClick={handleLeaveClick}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-red-500 hover:bg-red-500/10"
                        aria-label="Leave workspace"
                        title="Leave workspace"
                      >
                        <LogOut size={10} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Chat Section
interface ChatSectionProps {
  ws: Workspace;
  onAddMessage: (id: string, role: Role, text: string) => void;
  onShowMembers?: () => void;
}

const ChatSection = memo(function ChatSection({
  ws,
  onAddMessage,
  onShowMembers,
}: ChatSectionProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = chatRef.current;
    if (el)
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
  }, [ws.messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onAddMessage(ws.id, "user", input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= DESKTOP_BP) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  };

  const copyText = async (m: Message) => {
    await navigator.clipboard.writeText(m.text);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex ${HEADER_HEIGHT} items-center justify-between border-b px-4`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            # {ws.name.toLowerCase()}
          </span>
          {ws.code && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-foreground">
              {ws.code}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online
          {onShowMembers && (
            <button
              type="button"
              onClick={onShowMembers}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent lg:hidden"
              aria-label="View members"
            >
              <UserSearch size={14} />
            </button>
          )}
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          ref={chatRef}
          className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0"
        >
          <div className="h-full px-4 py-4">
            {ws.messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="rounded-xl border bg-muted/40 px-4 py-3 text-center">
                  <p className="font-medium">Welcome to {ws.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Send a message to start.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {ws.messages.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-start gap-3 rounded-lg p-2 hover:bg-accent/40"
                  >
                    <Avatar
                      name={m.role === "user" ? "You" : "Bot"}
                      variant={m.role === "user" ? "user" : "bot"}
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`text-sm font-medium ${
                            m.role === "bot" ? "text-green-600" : ""
                          }`}
                        >
                          {m.role === "user" ? "@You" : "@Bot"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {m.time}
                        </span>
                        {m.role === "bot" && (
                          <button
                            onClick={() => copyText(m)}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            {copiedId === m.id ? (
                              <Check size={12} />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>
                      <MDFormatting text={m.text} className="mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t p-3">
        <div className="rounded-xl border bg-muted/40 p-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${ws.name.toLowerCase()}...`}
            rows={1}
            className="max-h-[120px] min-h-[36px] w-full resize-none bg-transparent py-1 text-sm outline-none"
          />
          <div className="mt-1 flex items-center gap-1">
            {[Sticker].map((Icon, i) => (
              <Button key={i} variant="ghost" size="icon" className="h-7 w-7">
                <Icon size={16} />
              </Button>
            ))}

            <Button
              size="icon"
              className="ml-auto h-8 w-8"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Sidebar shared inner content
interface SidebarContentProps {
  active: SectionId;
  onClose: () => void;
  nav: (section: SectionId) => void;
  workspaces: Workspace[];
  starred: Workspace[];
  regular: Workspace[];
  renderDraggableWorkspace: (ws: Workspace) => ReactNode;
}

function SidebarContent({
  active,
  onClose,
  nav,
  workspaces,
  starred,
  regular,
  renderDraggableWorkspace,
}: SidebarContentProps) {
  return (
    <>
      <div
        className={`flex ${HEADER_HEIGHT} items-center justify-between border-b px-3`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            q
          </div>
          <span className="text-sm font-semibold">qPal</span>
          <span className="rounded bg-green-500/10 px-1.5 text-[9px] font-medium text-green-600">
            v1.0
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex flex-col gap-2 p-2">
        <NavItem
          active={active === "profile"}
          onClick={() => nav("profile")}
          label="Profile"
        >
          <User size={16} />
        </NavItem>
        <NavItem
          active={active === "explore"}
          onClick={() => nav("explore")}
          label="Explore"
        >
          <Compass size={16} />
        </NavItem>
      </nav>

      <div className="flex items-center justify-between px-5 py-2">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
          Workspaces
        </span>
        <button
          onClick={() => nav("create-workspace")}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus size={14} />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto px-2 pb-2
                   [scrollbar-gutter:stable] 
                   [scrollbar-width:thin]
                   [scrollbar-color:rgba(148,163,184,0.15)_transparent]
                   [&::-webkit-scrollbar]:w-1.5
                   [&::-webkit-scrollbar-track]:bg-transparent
                   [&::-webkit-scrollbar-track-piece]:bg-transparent
                   [&::-webkit-scrollbar-corner]:bg-transparent
                   [&::-webkit-scrollbar-button]:hidden
                   [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15
                   [&::-webkit-scrollbar-thumb]:rounded-full"
      >
        {workspaces.length === 0 ? (
          <button
            onClick={() => nav("empty")}
            className={`group flex w-full flex-col items-center gap-1 rounded-lg p-3 ${
              active === "empty" ? "bg-accent" : "hover:bg-accent/50"
            }`}
          >
            <Home size={16} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              No workspace
            </span>
          </button>
        ) : (
          <div className="flex flex-col space-y-2">
            {starred.length > 0 && (
              <>
                <p className="px-3 text-[10px] text-muted-foreground">
                  Starred
                </p>
                {starred.map(renderDraggableWorkspace)}
              </>
            )}

            {regular.length > 0 && (
              <>
                {starred.length > 0 && (
                  <p className="px-3 text-[10px] text-muted-foreground">All</p>
                )}
                {regular.map(renderDraggableWorkspace)}
              </>
            )}
          </div>
        )}
      </div>

      <div className="border-t p-2">
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5">
          <Avatar name="You" size="sm" />
          <div className="flex-1">
            <p className="text-xs font-medium">You</p>
            <p className="text-[10px] text-muted-foreground">Online</p>
          </div>
          <ModeToggle />
        </div>
      </div>
    </>
  );
}

const DROPDOWN_WIDTH = 128;
const DROPDOWN_HEIGHT = 120;
const DROPDOWN_MARGIN = 8;

// Sidebar (memoized) with drag-and-drop reordering
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  active: SectionId;
  setActive: (s: SectionId) => void;
  workspaces: Workspace[];
  onAction: (action: string, id?: string) => void;
  onReorder: (sourceId: string, targetId: string) => void;
}

const Sidebar = memo(function Sidebar({
  isOpen,
  onClose,
  active,
  setActive,
  workspaces,
  onAction,
  onReorder,
}: SidebarProps) {
  const [optionsFor, setOptionsFor] = useState<{
    id: string;
    pos: { top: number; left: number };
  } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const { starred, regular } = useMemo(() => {
    const starred: Workspace[] = [];
    const regular: Workspace[] = [];
    for (const ws of workspaces) {
      (ws.starred ? starred : regular).push(ws);
    }
    return { starred, regular };
  }, [workspaces]);

  const nav = useCallback(
    (section: SectionId) => {
      setActive(section);
      setOptionsFor(null);
      onClose();
    },
    [setActive, onClose]
  );

  const handleWorkspaceClick = useCallback(
    (id: string) => {
      nav(id);
    },
    [nav]
  );

  const handleWorkspaceOptions = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>, id: string) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top = rect.top;
      let left = rect.right + DROPDOWN_MARGIN;

      if (left + DROPDOWN_WIDTH > vw - DROPDOWN_MARGIN) {
        left = rect.left - DROPDOWN_WIDTH - DROPDOWN_MARGIN;
      }

      if (left < DROPDOWN_MARGIN) left = DROPDOWN_MARGIN;

      if (top + DROPDOWN_HEIGHT > vh - DROPDOWN_MARGIN) {
        top = vh - DROPDOWN_HEIGHT - DROPDOWN_MARGIN;
      }

      if (top < DROPDOWN_MARGIN) top = DROPDOWN_MARGIN;

      setOptionsFor((prev) =>
        prev?.id === id
          ? null
          : {
              id,
              pos: { top, left },
            }
      );
    },
    []
  );

  const handleDragStart = useCallback((id: string) => {
    setDragId(id);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, id: string) => {
      e.preventDefault();
      if (!dragId || dragId === id) return;
    },
    [dragId]
  );

  const handleDrop = useCallback(
    (id: string) => {
      if (!dragId || dragId === id) return;
      onReorder(dragId, id);
      setDragId(null);
    },
    [dragId, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragId(null);
  }, []);

  const optionsWorkspace = useMemo(
    () => (optionsFor ? workspaces.find((w) => w.id === optionsFor.id) : null),
    [workspaces, optionsFor]
  );

  const renderDraggableWorkspace = useCallback(
    (ws: Workspace) => (
      <div
        key={ws.id}
        draggable
        onDragStart={() => handleDragStart(ws.id)}
        onDragOver={(e) => handleDragOver(e, ws.id)}
        onDrop={() => handleDrop(ws.id)}
        onDragEnd={handleDragEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="cursor-grab active:cursor-grabbing select-none touch-pan-y"
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
        }}
      >
        <WorkspaceItem
          ws={ws}
          active={active === ws.id}
          onClick={() => handleWorkspaceClick(ws.id)}
          onOptions={(e) => handleWorkspaceOptions(e, ws.id)}
          optionsOpen={optionsFor?.id === ws.id}
        />
      </div>
    ),
    [
      active,
      handleDragEnd,
      handleDragOver,
      handleDragStart,
      handleDrop,
      handleWorkspaceClick,
      handleWorkspaceOptions,
      optionsFor?.id,
    ]
  );

  return (
    <>
      <aside
        className={[
          "fixed left-0 top-0 z-50 flex h-full w-full bg-background/40 backdrop-blur-md md:hidden",
          "transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        onClick={onClose}
      >
        <div
          className="m-3 flex h[calc(100vh-1.5rem)] w-full max-w-sm flex-col overflow-hidden
                     rounded-2xl border bg-background/90 p-2 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <SidebarContent
            active={active}
            onClose={onClose}
            nav={nav}
            workspaces={workspaces}
            starred={starred}
            regular={regular}
            renderDraggableWorkspace={renderDraggableWorkspace}
          />
        </div>
      </aside>

      <aside className="hidden h-full w-56 flex-col border-r bg-background md:flex">
        <SidebarContent
          active={active}
          onClose={onClose}
          nav={nav}
          workspaces={workspaces}
          starred={starred}
          regular={regular}
          renderDraggableWorkspace={renderDraggableWorkspace}
        />
      </aside>

      {optionsFor && optionsWorkspace && (
        <OptionsDropdown
          ws={optionsWorkspace}
          pos={optionsFor.pos}
          onClose={() => setOptionsFor(null)}
          onAction={(action) => onAction(action, optionsFor.id)}
        />
      )}
    </>
  );
});

// Main Page
export default function Page() {
  const [active, setActive] = useState<SectionId>("empty");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileTopNavOpen, setMobileTopNavOpen] = useState(false);
  const [dialog, setDialog] = useState<{
    type: DialogType;
    id: string;
  } | null>(null);

  const [membersViewFor, setMembersViewFor] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= DESKTOP_BP) {
        setSidebarOpen(false);
        setMobileTopNavOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleCreate = useCallback((name: string, color: string) => {
    const ws: Workspace = {
      id: uid(),
      code: generateWorkspaceCode(),
      name,
      messages: [],
      color,
      members: [
        {
          id: uid(),
          name: "You",
          role: "Owner",
          status: "online",
        },
      ],
    };
    setWorkspaces((p) => [...p, ws]);
    setActive(ws.id);
  }, []);

  const handleAddMessage = useCallback(
    (wsId: string, role: Role, text: string) => {
      setWorkspaces((p) =>
        p.map((ws) =>
          ws.id === wsId
            ? {
                ...ws,
                messages: [
                  ...ws.messages,
                  { id: uid(), role, text, time: now() },
                ],
              }
            : ws
        )
      );
    },
    []
  );

  const handleAction = useCallback(
    (action: string, id?: string) => {
      if (!id) return;

      if (action === "rename") {
        setDialog({ type: "rename", id });
        return;
      }

      if (action === "delete") {
        setDialog({ type: "delete", id });
        return;
      }

      if (action === "star") {
        const ws = workspaces.find((w) => w.id === id);
        if (!ws) return;

        const willStar = !ws.starred;

        setWorkspaces((prev) =>
          prev.map((w) => (w.id === id ? { ...w, starred: willStar } : w))
        );

        toast.success(
          willStar ? `Starred "${ws.name}"` : `Unstarred "${ws.name}"`
        );
      }
    },
    [workspaces]
  );

  const handleRename = useCallback((id: string, name: string) => {
    setWorkspaces((p) => p.map((ws) => (ws.id === id ? { ...ws, name } : ws)));
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setWorkspaces((p) => p.filter((ws) => ws.id !== id));
      if (active === id) setActive("empty");
      setMembersViewFor((cur) => (cur === id ? null : cur));
    },
    [active]
  );

  const handleAddMember = useCallback(
    (wsId: string, username: string) => {
      const ws = workspaces.find((w) => w.id === wsId);

      setWorkspaces((p) =>
        p.map((w) =>
          w.id === wsId
            ? {
                ...w,
                members: [
                  ...(w.members ?? []),
                  {
                    id: uid(),
                    name: `@${username}`,
                    role: "Member",
                    status: "online",
                  },
                ],
              }
            : w
        )
      );

      toast.success(`Added @${username} to "${ws?.name ?? "workspace"}"`);
    },
    [workspaces]
  );

  const handleReorder = useCallback((sourceId: string, targetId: string) => {
    setWorkspaces((prev) => {
      const currentIndex = prev.findIndex((w) => w.id === sourceId);
      const targetIndex = prev.findIndex((w) => w.id === targetId);
      if (currentIndex === -1 || targetIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }, []);

  const handleLeaveWorkspace = useCallback(
    (wsId: string) => {
      const ws = workspaces.find((w) => w.id === wsId);
      if (!ws) return;

      const next = workspaces.filter((w) => w.id !== wsId);
      setWorkspaces(next);

      if (active === wsId) {
        if (next.length === 0) {
          setActive("empty");
        } else {
          const firstStarred = next.find((w) => w.starred);
          setActive(firstStarred ? firstStarred.id : next[0].id);
        }
      }

      setMembersViewFor((cur) => (cur === wsId ? null : cur));

      toast.success(`You left "${ws.name}"`);
    },
    [workspaces, active]
  );

  const handleHomeClick = useCallback(() => {
    if (workspaces.length === 0) {
      setActive("empty");
      return;
    }
    const firstStarred = workspaces.find((ws) => ws.starred);
    if (firstStarred) setActive(firstStarred.id);
    else setActive(workspaces[0].id);
  }, [workspaces]);

  const activeWs = useMemo(
    () => workspaces.find((ws) => ws.id === active),
    [workspaces, active]
  );

  const showEmpty =
    active === "empty" ||
    (!activeWs &&
      !["profile", "explore", "create-workspace", "docs"].includes(active));

  const homeActive =
    active !== "profile" &&
    active !== "explore" &&
    active !== "create-workspace" &&
    active !== "docs";

  const dialogWs = dialog ? workspaces.find((ws) => ws.id === dialog.id) : null;

  const currentTopLabel = active === "docs" ? "Docs" : "Home";

  const topNavItems = [
    {
      key: "Home",
      active: homeActive,
      onClick: () => {
        handleHomeClick();
        setMobileTopNavOpen(false);
      },
    },
    {
      key: "Docs",
      active: active === "docs",
      onClick: () => {
        setActive("docs");
        setMobileTopNavOpen(false);
      },
    },
    {
      key: "Support",
      active: false,
      onClick: () => {
        setMobileTopNavOpen(false);
      },
    },
  ];

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        active={active}
        setActive={setActive}
        workspaces={workspaces}
        onAction={handleAction}
        onReorder={handleReorder}
      />

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <header
          className={`relative flex ${HEADER_HEIGHT} items-center justify-between border-b px-3`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent md:hidden"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-1.5 md:hidden">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                q
              </div>
              <span className="text-sm font-semibold">qPal</span>
            </div>

            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setMobileTopNavOpen((v) => !v)}
                className="flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent"
              >
                <span>{currentTopLabel}</span>
                <ChevronDown
                  size={12}
                  className={`transition-transform ${
                    mobileTopNavOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {mobileTopNavOpen && (
                <div className="absolute left-0 top-8 z-40 w-32 rounded-md border bg-popover py-1 text-[11px] shadow-md">
                  {topNavItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={item.onClick}
                      className={`flex w-full items-center justify-between px-2 py-1.5 text-left ${
                        item.active
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
                      }`}
                    >
                      <span>{item.key}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden gap-1 text-[11px] text-muted-foreground md:flex">
              {["Home", "Docs", "Support"].map((item) => (
                <button
                  key={item}
                  onClick={
                    item === "Home"
                      ? handleHomeClick
                      : item === "Docs"
                      ? () => setActive("docs")
                      : undefined
                  }
                  className={`rounded px-2 py-1 ${
                    (item === "Home" && homeActive) ||
                    (item === "Docs" && active === "docs")
                      ? "bg-accent text-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              Signed in as{" "}
              <span className="font-medium text-foreground">You</span>
            </span>
            <div className="md:hidden">
              <Avatar name="You" size="sm" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {active === "profile" && (
            <ProfileSection
              onRequestLogout={() =>
                setDialog({ type: "logout", id: "logout" })
              }
            />
          )}

          {active === "explore" && (
            <div
              className="h-full overflow-y-auto p-4
                         [scrollbar-gutter:stable]
                         [scrollbar-width:thin]
                         [scrollbar-color:rgba(148,163,184,0.15)_transparent]
                         [&::-webkit-scrollbar]:w-1.5
                         [&::-webkit-scrollbar-track]:bg-transparent
                         [&::-webkit-scrollbar-track-piece]:bg-transparent
                         [&::-webkit-scrollbar-corner]:bg-transparent
                         [&::-webkit-scrollbar-button]:hidden
                         [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15
                         [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              <div className="mx-auto max-w-2xl">
                <h1 className="font-semibold">Explore</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Discover features and integrations.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {["Templates", "Integrations", "Plugins", "Community"].map(
                    (item) => (
                      <div
                        key={item}
                        className="rounded-xl border bg-muted/40 p-3 hover:bg-accent/50"
                      >
                        <p className="font-medium">{item}</p>
                        <p className="text-xs text-muted-foreground">
                          Coming soon...
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {active === "create-workspace" && (
            <CreateWorkspace
              onCreate={handleCreate}
              onCancel={() => setActive("empty")}
            />
          )}

          {active === "docs" && (
            <div
              className="h-full overflow-y-auto p-4
                         [scrollbar-gutter:stable]
                         [scrollbar-width:thin]
                         [scrollbar-color:rgba(148,163,184,0.15)_transparent]
                         [&::-webkit-scrollbar]:w-1.5
                         [&::-webkit-scrollbar-track]:bg-transparent
                         [&::-webkit-scrollbar-track-piece]:bg-transparent
                         [&::-webkit-scrollbar-corner]:bg-transparent
                         [&::-webkit-scrollbar-button]:hidden
                         [&::-webkit-scrollbar-thumb]:bg-muted-foreground/15
                         [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              <Docs />
            </div>
          )}

          {showEmpty && (
            <EmptyState onCreate={() => setActive("create-workspace")} />
          )}

          {activeWs && (
            <div className="flex h-full">
              <div className="min-w-0 flex-1">
                {membersViewFor === activeWs.id ? (
                  <MembersMainSection
                    ws={activeWs}
                    onBack={() => setMembersViewFor(null)}
                    onRequestAddMember={(id) =>
                      setDialog({ type: "add-member", id })
                    }
                    onRequestLeaveWorkspace={(id) =>
                      setDialog({ type: "leave", id })
                    }
                  />
                ) : (
                  <ChatSection
                    ws={activeWs}
                    onAddMessage={handleAddMessage}
                    onShowMembers={() => setMembersViewFor(activeWs.id)}
                  />
                )}
              </div>

              <MembersPanel
                ws={activeWs}
                onRequestAddMember={(id) =>
                  setDialog({ type: "add-member", id })
                }
                onRequestLeaveWorkspace={(id) =>
                  setDialog({ type: "leave", id })
                }
              />
            </div>
          )}
        </main>
      </div>

      {dialog?.type === "rename" && dialogWs && (
        <RenameDialog
          ws={dialogWs}
          onRename={(name) => handleRename(dialogWs.id, name)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "delete" && dialogWs && (
        <DeleteDialog
          ws={dialogWs}
          onConfirm={() => {
            handleDelete(dialogWs.id);
            toast.success(`Deleted workspace "${dialogWs.name}"`);
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "add-member" && dialogWs && (
        <AddMemberDialog
          ws={dialogWs}
          onAdd={(username) => handleAddMember(dialogWs.id, username)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "leave" && dialogWs && (
        <LeaveDialog
          ws={dialogWs}
          onConfirm={() => handleLeaveWorkspace(dialogWs.id)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "logout" && (
        <LogoutDialog
          onConfirm={() => {
            toast.success("Logged out");
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
