# Auth reference

This file lists the key source files created for the Next.js + Supabase auth system. Each numbered section is the file path followed by the full source.

1. `app/api/auth/register/route.ts`

```ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, full_name, email, password } = body || {};

    if (!username || !full_name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create auth user using service role
    const { data: createdUser, error: createError } =
      await supabaseServer.auth.admin.createUser({
        email,
        password,
      });

    if (createError) {
      // handle email already registered
      const msg = createError.message || "Unable to create user";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const userId = createdUser?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "Failed to get user id after creation" },
        { status: 500 }
      );
    }

    // Insert profile record
    const { data: profileData, error: insertError } = await supabaseServer
      .from("profiles")
      .insert([{ id: userId, username, full_name, email }]);

    if (insertError) {
      // try to cleanup created auth user to avoid orphaned accounts
      try {
        if (userId) await supabaseServer.auth.admin.deleteUser(userId);
      } catch (e) {
        // noop
      }

      const message = insertError.message || "Failed to create profile";
      // map unique violations to friendly messages
      if (/duplicate|unique/i.test(message)) {
        if (message.includes("username")) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 409 }
          );
        }
        if (message.includes("email")) {
          return NextResponse.json(
            { error: "Email already registered" },
            { status: 409 }
          );
        }
      }

      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
```

2. `app/register/page.tsx`

```tsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RegisterPage() {
  const [step, setStep] = useState<number>(1);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function goNext() {
    setError(null);
    if (!username.trim() || !fullName.trim()) {
      setError("Please provide a username and full name to continue.");
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          full_name: fullName,
          email,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Registration failed");
        setLoading(false);
        return;
      }

      // success
      router.push("/login");
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Username</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Full name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 items-center">
                  <div />
                  <div className="text-right">
                    <Button type="button" onClick={goNext}>
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Confirm password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                  </div>
                  <div>
                    <Button type="submit" disabled={loading}>
                      {loading ? "Creating…" : "Create account"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>

          {error && (
            <div className="text-destructive text-sm mt-4">{error}</div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

3. `app/login/page.tsx`

```tsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import createSupabaseClient from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseClient;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }

      // Signed in
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                New?{" "}
                <Link href="/register" className="underline text-primary">
                  Create account
                </Link>
              </div>
              <div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </div>
            </div>
          </form>

          {error && (
            <div className="text-destructive text-sm mt-4">{error}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

4. `app/dashboard/page.tsx`

```tsx
"use client";
import React, { useEffect, useState } from "react";
import createSupabaseClient from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  is_verified: boolean;
};

export default function DashboardPage() {
  const supabase = createSupabaseClient;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const {
        data: { user },
        error: sessionError,
      } = await supabase.auth.getUser();

      if (sessionError || !user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, email, is_verified")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        setProfile(null);
      } else {
        if (mounted) setProfile(data as Profile | null);
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div>Loading…</div>}
          {!loading && !profile && (
            <div>Please sign in to see your dashboard.</div>
          )}

          {!loading && profile && (
            <div className="space-y-2">
              <div>
                <strong>Full name:</strong>{" "}
                <span className="ml-2">{profile.full_name}</span>
              </div>
              <div>
                <strong>Username:</strong>{" "}
                <span className="ml-2">{profile.username}</span>
              </div>
              <div>
                <strong>Email:</strong>{" "}
                <span className="ml-2">{profile.email}</span>
              </div>
              <div>
                <strong>Account type:</strong>{" "}
                <span className="ml-2">
                  {profile.is_verified ? "verified" : "standard"}
                </span>
              </div>
              <div className="pt-4">
                <Button variant="ghost" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

5. `lib/supabaseClient.ts`

```ts
"use client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Next public Supabase environment variables");
}

export const createSupabaseClient = (): SupabaseClient =>
  createClient(supabaseUrl, supabaseAnonKey);

export default createSupabaseClient();
```

6. `lib/supabaseServer.ts`

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error(
    "Missing Supabase server environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)"
  );
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRole);

export default supabaseServer;
```

7. `lib/types.ts`

```ts
export type Profile = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  is_verified: boolean;
};
```

8. `db.sql` (DDL + policies + example queries)

```sql
-- Profiles table for Next.js + Supabase
-- Run this in the Supabase SQL editor

-- 1) Create profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) Policies: allow users to SELECT/UPDATE/INSERT only their own profile
-- SELECT: users can read their own profile
CREATE POLICY "select_own_profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: users can update their own profile
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: allow user to insert their own profile (if you sign up client-side)
CREATE POLICY "insert_own_profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Note: service_role key bypasses RLS and is used by server-side functions

-- Example SQL queries

-- Select a profile by user id
-- Replace '<USER_UUID>' with the real UUID
SELECT id, username, full_name, email, is_verified, created_at
FROM public.profiles
WHERE id = '<USER_UUID>';

-- Select a profile by email
SELECT id, username, full_name, email, is_verified, created_at
FROM public.profiles
WHERE email = 'user@example.com';

-- Mark a user as verified
UPDATE public.profiles
SET is_verified = true
WHERE id = '<USER_UUID>';

-- Example: create index to speed lookups on username (optional, UNIQUE already exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

```

9. `.env.local.example`

```env
# Client (browser) keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server (service role) - keep this secret
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

```

---

If you want this filename changed or additional files added to the reference (for example other `components/ui/*` helpers), tell me which files and I'll append them. The file `AUTH_REFERENCE.md` is now added to the project root.
