```sql
-- 1) App-level user_profiles table (store canonical username and verified flag)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  username_ci text GENERATED ALWAYS AS (lower(username)) STORED,
  verified boolean DEFAULT false,
  verified_at timestamptz
);

-- 2) Unique index on case-insensitive username
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_username_ci_unique
  ON public.user_profiles(username_ci)
  WHERE username IS NOT NULL;
```

```sql
-- Enable RLS on user_profiles
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: allow authenticated users to SELECT their own profile
CREATE POLICY IF NOT EXISTS "user_profiles_select_self" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING ( user_id = auth.uid() );

-- Policy: allow authenticated users to INSERT their own profile (sign-up)
CREATE POLICY IF NOT EXISTS "user_profiles_insert_self" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ( user_id = auth.uid() );

-- Policy: allow authenticated users to UPDATE only non-verified fields on their own profile
CREATE POLICY IF NOT EXISTS "user_profiles_update_self" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ( user_id = auth.uid() )
  WITH CHECK ( user_id = auth.uid() AND verified IS NOT TRUE );

-- Policy: Prevent clients from setting verified=true (only service role / Edge Function should)
-- We allow service_role (bypasses RLS) to update verified. No policy needed for service_role.
```

```sql
-- Function to create a profile for every new auth user
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
begin
  -- Read username from auth.user's raw_user_meta_data
  raw_username := nullif(trim(new.raw_user_meta_data->>'username'), '');

  -- If no username was provided, just skip profile creation
  if raw_username is null then
    return new;
  end if;

  -- Insert into user_profiles. This will enforce the unique username CI index.
  insert into public.user_profiles (user_id, username)
  values (new.id, raw_username);

  return new;
end;
$$;

-- Trigger on auth.users to call the function
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();
```
