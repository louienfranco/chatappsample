```json
[
  {
    "name": "Example Emote",
    "id": "01F6MQ33FG000FFJ97ZB8MWV52",
    "category": "cat"
  },
  {
    "name": "Another Emote",
    "id": "01F5VW2TKR0003RCV2Z6JBHCST",
    "category": "cat"
  },
  {
    "name": "Another Emote",
    "id": "01F779KZC8000D25DGAC8PTX5Q",
    "category": "peepo"
  },
  {
    "name": "Another Emote",
    "id": "01FM6380QR000B3TR3VAP7TCSF",
    "category": "peepo"
  }
]
```

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import emotesData from "./emote.json";
import AutoAdd from "./AutoAdd";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Emote = {
  name: string;
  id: string;
  category?: string; // optional so old/new emotes still work
  type?: "emote" | "sticker";
};

// Use 7TV CDN for emotes
const EMOTE_BASE_URL = "https://cdn.7tv.app/emote";
const EMOTES = emotesData as Emote[];

// Unique category list for the Select
const CATEGORIES: string[] = Array.from(
  new Set(EMOTES.map((e) => e.category).filter(Boolean) as string[])
);

type EmotePickerButtonProps = {
  onSelect?: (emote: Emote) => void;
  children?: React.ReactNode;
};

// Renders a single emote using a fresh blob URL
function AnimatedEmote({
  emote,
  onSelect,
  resetCounter,
}: {
  emote: Emote;
  onSelect: (emote: Emote) => void;
  resetCounter?: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Reset the loaded flag when the resetCounter changes so the image
  // shows the loading state and restarts animated playback on reopen.
  // Defer the state update to avoid calling setState synchronously inside
  // an effect which can trigger cascading renders.
  useEffect(() => {
    if (typeof resetCounter === "undefined") return;
    const t = setTimeout(() => setLoaded(false), 0);
    return () => clearTimeout(t);
  }, [resetCounter]);

  // Append resetCounter to force the browser to reload the image when the
  // modal is closed and reopened — this resets animated WebP playback.
  const src = `${EMOTE_BASE_URL}/${emote.id}/1x.webp${
    typeof resetCounter !== "undefined" ? `?r=${resetCounter}` : ""
  }`;

  // Lazy-load images only when the emote button is visible in the scroll area.
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    if (inView) return; // already visible

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        });
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [inView]);

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={() => onSelect(emote)}
      className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/40 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={emote.name}
      title={emote.category ? `${emote.name} (${emote.category})` : emote.name}
    >
      {inView ? (
        <img
          key={`${emote.id}-${resetCounter ?? 0}`}
          src={src}
          alt={emote.name}
          width={28}
          height={28}
          loading="lazy"
          className={
            loaded
              ? "rounded object-contain"
              : "rounded object-contain opacity-0"
          }
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className="h-7 w-7 animate-pulse rounded bg-muted" />
      )}

      {!loaded && inView && (
        <div className="h-7 w-7 animate-pulse rounded bg-muted absolute" />
      )}
    </button>
  );
}

function EmotePickerButton({ onSelect, children }: EmotePickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | string>(
    "all"
  );
  const [selectedType, setSelectedType] = useState<"all" | "emote" | "sticker">(
    "all"
  );

  const handleSelect = (emote: Emote) => {
    onSelect?.(emote);
    setOpen(false);
  };

  const filteredEmotes = EMOTES.filter((emote) => {
    // Filter by category first
    if (selectedCategory !== "all" && emote.category !== selectedCategory) {
      return false;
    }

    if (selectedType !== "all") {
      // treat missing type as 'emote' by default
      const eType: "emote" | "sticker" =
        (emote.type as "emote" | "sticker") || "emote";
      if (eType !== selectedType) return false;
    }

    const q = search.trim().toLowerCase();
    if (!q) return true;

    const name = emote.name.toLowerCase();
    const category = (emote.category ?? "").toLowerCase();
    return name.includes(q) || category.includes(q);
  });

  const handleOpenChange = (value: boolean) => {
    // Increment the reset counter when the dialog opens so images get a
    // cache-busting query param and the animated WebP restarts each time
    // the picker is opened without requiring a full page refresh.
    if (value) setResetCounter((c) => c + 1);
    setOpen(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
          {children ?? <span className="text-lg">😊</span>}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Emotes</DialogTitle>
          <DialogDescription className="text-xs">
            Filter by category and search by name or category.
          </DialogDescription>
        </DialogHeader>

        {/* Filters row */}
        <div className="flex gap-2">
          <Select
            value={selectedCategory}
            onValueChange={(value) =>
              setSelectedCategory(value as "all" | string)
            }
          >
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
          <select
            value={selectedType}
            onChange={(e) =>
              setSelectedType(e.target.value as "all" | "emote" | "sticker")
            }
            className="h-8 rounded border bg-transparent px-2 text-xs"
          >
            <option value="all">All</option>
            <option value="emote">Emote</option>
            <option value="sticker">Sticker</option>
          </select>
        </div>

        {/* Emotes grid */}
        <ScrollArea className="mt-2 h-64 rounded-md border">
          <div className="grid grid-cols-7 gap-1.5 p-2">
            {open &&
              filteredEmotes.map((emote) => (
                <AnimatedEmote
                  key={`${emote.id}-${resetCounter}`}
                  emote={emote}
                  onSelect={handleSelect}
                  resetCounter={resetCounter}
                />
              ))}

            {open && filteredEmotes.length === 0 && (
              <div className="col-span-7 py-4 text-center text-xs text-muted-foreground">
                No emotes found.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function EmoteSelectionPage() {
  // Prevent server-side rendering for parts that cause hydration mismatches
  // (some browser/third-party attributes can differ between server and
  // client). `ClientOnly` renders children only after the component has
  // mounted on the client, avoiding SSR for `AutoAdd`.
  function ClientOnly({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted ? <>{children}</> : null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl">
        <ClientOnly>
          <AutoAdd />
        </ClientOnly>
        <div className="mt-4">
          <EmotePickerButton />
        </div>
      </div>
    </main>
  );
}

```
