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
'use client';

import { useState, useEffect } from 'react';
import emotesData from './emote.json';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

type Emote = {
  name: string;
  id: string;
  category?: string; // optional so old/new emotes still work
};

const EMOTE_BASE_URL = 'https://cdn.7tv.app/emote';
const EMOTES = emotesData as Emote[];

// Unique category list for the Select
const CATEGORIES: string[] = Array.from(
  new Set(
    EMOTES.map((e) => e.category).filter(Boolean) as string[]
  )
);

type EmotePickerButtonProps = {
  onSelect?: (emote: Emote) => void;
  children?: React.ReactNode;
};

// Renders a single emote using a fresh blob URL
function AnimatedEmote({
  emote,
  onSelect,
}: {
  emote: Emote;
  onSelect: (emote: Emote) => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    const fetchImage = async () => {
      try {
        const response = await fetch(
          `${EMOTE_BASE_URL}/${emote.id}/2x.avif`
        );
        const blob = await response.blob();
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (error) {
        console.error('Failed to fetch emote:', error);
      }
    };

    fetchImage();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [emote.id]);

  return (
    <button
      type="button"
      onClick={() => onSelect(emote)}
      className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/40 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={emote.name}
      title={
        emote.category ? `${emote.name} (${emote.category})` : emote.name
      }
    >
      {blobUrl ? (
        <img
          src={blobUrl}
          alt={emote.name}
          width={28}
          height={28}
          className="rounded object-contain"
        />
      ) : (
        <div className="h-7 w-7 animate-pulse rounded bg-muted" />
      )}
    </button>
  );
}

function EmotePickerButton({ onSelect, children }: EmotePickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | string>(
    'all'
  );

  const handleSelect = (emote: Emote) => {
    onSelect?.(emote);
    setOpen(false);
  };

  const filteredEmotes = EMOTES.filter((emote) => {
    // Filter by category first
    if (
      selectedCategory !== 'all' &&
      emote.category !== selectedCategory
    ) {
      return false;
    }

    const q = search.trim().toLowerCase();
    if (!q) return true;

    const name = emote.name.toLowerCase();
    const category = (emote.category ?? '').toLowerCase();
    return name.includes(q) || category.includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full"
        >
          {children ?? <span className="text-lg">😊</span>}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Emotes
          </DialogTitle>
          <DialogDescription className="text-xs">
            Filter by category and search by name or category.
          </DialogDescription>
        </DialogHeader>

        {/* Filters row */}
        <div className="flex gap-2">
          <Select
            value={selectedCategory}
            onValueChange={(value) =>
              setSelectedCategory(value as 'all' | string)
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
        </div>

        {/* Emotes grid */}
        <ScrollArea className="mt-2 h-64 rounded-md border">
          <div className="grid grid-cols-7 gap-1.5 p-2">
            {open &&
              filteredEmotes.map((emote) => (
                <AnimatedEmote
                  key={emote.id}
                  emote={emote}
                  onSelect={handleSelect}
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
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <EmotePickerButton />
    </main>
  );
}
```
