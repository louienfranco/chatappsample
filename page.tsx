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
  Sticker, // ⬅️ replaced Globe, Lightbulb, Image with Sticker
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
  ChevronRight,
  Palette,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  GripVertical,
} from "lucide-react";

import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/mode-toggle";
import MDFormatting from "@/components/MDFormatting";

// Types
type Role = "user" | "bot";
type SectionId = "profile" | "explore" | "empty" | "create-workspace" | string;

interface Message {
  id: string;
  role: Role;
  text: string;
  time: string;
}

interface Member {
  id: string;
  name: string; // used as "@username" in UI
  role: string;
  status: "online" | "offline";
}

interface Workspace {
  id: string;
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

// Workspace Item (with GripVertical icon)
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
    <div className="group relative flex items-center gap-1">
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) onCreate(name.trim(), color);
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-md">
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
              <p className="font-medium">{name.trim() || "Workspace Name"}</p>
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
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

// Profile Section
function ProfileSection() {
  const settings = [
    { icon: Palette, label: "Appearance", desc: "Theme & display" },
    { icon: Bell, label: "Notifications", desc: "Alerts & sounds" },
    { icon: Shield, label: "Privacy", desc: "Security & data" },
    { icon: UserCog, label: "Account", desc: "Email & password" },
  ];

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="h-16 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
          <div className="relative px-4 pb-4">
            <div className="absolute -top-7 left-4 rounded-xl border-4 border-card">
              <Avatar name="You" size="lg" />
            </div>
            <div className="pt-10">
              <h1 className="text-lg font-semibold">You</h1>
              <p className="text-sm text-muted-foreground">
                you@example.com
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {settings.map((s) => (
            <button
              key={s.label}
              className="group flex w-full items-center gap-3 rounded-xl border bg-muted/40 p-3 hover:bg-accent/50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <s.icon size={18} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Members Panel
function MembersPanel({
  ws,
  onRequestAddMember,
}: {
  ws: Workspace;
  onRequestAddMember: (wsId: string) => void;
}) {
  const members = ws.members ?? [];

  const handleAddClick = () => {
    onRequestAddMember(ws.id);
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
      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5"
          >
            <Avatar name={m.name} size="sm" />
            <div className="flex-1">
              <p className="text-xs font-medium">{m.name}</p>
              <p className="text-[10px] text-muted-foreground">{m.role}</p>
            </div>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                m.status === "online"
                  ? "bg-green-500"
                  : "bg-muted-foreground/40"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Chat Section (center / main column)
interface ChatSectionProps {
  ws: Workspace;
  onAddMessage: (id: string, role: Role, text: string) => void;
}

const ChatSection = memo(function ChatSection({
  ws,
  onAddMessage,
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
      {/* Top bar */}
      <div
        className={`flex ${HEADER_HEIGHT} items-center justify-between border-b px-4`}
      >
        <span className="text-sm font-semibold">
          # {ws.name.toLowerCase()}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online
        </span>
      </div>

      {/* Messages area */}
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

      {/* Input area */}
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
            {/* Single Sticker button replacing Globe, Lightbulb, and Image */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
            >
              <Sticker size={16} />
            </Button>

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
      setOptionsFor((prev) =>
        prev?.id === id
          ? null
          : {
              id,
              pos: { top: rect.top, left: rect.right + 8 },
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

  const renderDraggableWorkspace = (ws: Workspace) => (
    <div
      key={ws.id}
      draggable
      onDragStart={() => handleDragStart(ws.id)}
      onDragOver={(e) => handleDragOver(e, ws.id)}
      onDrop={() => handleDrop(ws.id)}
      onDragEnd={handleDragEnd}
      className="cursor-grab active:cursor-grabbing"
    >
      <WorkspaceItem
        ws={ws}
        active={active === ws.id}
        onClick={() => handleWorkspaceClick(ws.id)}
        onOptions={(e) => handleWorkspaceOptions(e, ws.id)}
        optionsOpen={optionsFor?.id === ws.id}
      />
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r bg-background transition-transform md:relative md:z-auto md:w-56 md:translate-x-0 ${
          isOpen ? "" : "-translate-x-full"
        }`}
      >
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
                    <p className="px-3 text-[10px] text-muted-foreground">
                      All
                    </p>
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
  const [dialog, setDialog] = useState<{
    type: "rename" | "delete" | "add-member";
    id: string;
  } | null>(null);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= DESKTOP_BP) setSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleCreate = useCallback((name: string, color: string) => {
    const ws: Workspace = {
      id: uid(),
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

  // ACTIONS with toasts: rename / delete / star
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
          prev.map((w) =>
            w.id === id ? { ...w, starred: willStar } : w
          )
        );

        toast.success(
          willStar
            ? `Starred "${ws.name}"`
            : `Unstarred "${ws.name}"`
        );
      }
    },
    [workspaces]
  );

  const handleRename = useCallback((id: string, name: string) => {
    setWorkspaces((p) =>
      p.map((ws) => (ws.id === id ? { ...ws, name } : ws))
    );
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setWorkspaces((p) => p.filter((ws) => ws.id !== id));
      if (active === id) setActive("empty");
    },
    [active]
  );

  // ADD MEMBER with toast
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

      toast.success(
        `Added @${username} to "${ws?.name ?? "workspace"}"`
      );
    },
    [workspaces]
  );

  const handleReorder = useCallback(
    (sourceId: string, targetId: string) => {
      setWorkspaces((prev) => {
        const currentIndex = prev.findIndex((w) => w.id === sourceId);
        const targetIndex = prev.findIndex((w) => w.id === targetId);
        if (currentIndex === -1 || targetIndex === -1) return prev;
        const next = [...prev];
        const [moved] = next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    },
    []
  );

  // Home behavior: first starred, else first workspace, else empty
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
    (!activeWs && !["profile", "explore", "create-workspace"].includes(active));

  const homeActive =
    active !== "profile" &&
    active !== "explore" &&
    active !== "create-workspace";

  const dialogWs = dialog
    ? workspaces.find((ws) => ws.id === dialog.id)
    : null;

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
          className={`flex ${HEADER_HEIGHT} items-center justify-between border-b px-3`}
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
            <div className="hidden gap-1 text-[11px] text-muted-foreground md:flex">
              {["Home", "Docs", "Support"].map((item) => (
                <button
                  key={item}
                  onClick={item === "Home" ? handleHomeClick : undefined}
                  className={`rounded px-2 py-1 ${
                    item === "Home" && homeActive
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
          {active === "profile" && <ProfileSection />}

          {active === "explore" && (
            <div className="h-full overflow-y-auto p-4">
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

          {showEmpty && (
            <EmptyState onCreate={() => setActive("create-workspace")} />
          )}

          {activeWs && (
            <div className="flex h-full">
              <div className="min-w-0 flex-1">
                <ChatSection ws={activeWs} onAddMessage={handleAddMessage} />
              </div>

              <MembersPanel
                ws={activeWs}
                onRequestAddMember={(id) =>
                  setDialog({ type: "add-member", id })
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
    </div>
  );
}
