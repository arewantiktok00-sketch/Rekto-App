# 📋 How to Create Database Tables in Supabase

## Quick Steps (5 minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Sign in and select your project

### Step 2: Open SQL Editor
1. Click **"SQL Editor"** in the left sidebar (icon looks like `</>`)
2. Click **"New query"** button

### Step 3: Copy and Paste the SQL
1. Open the file: `supabase/migrations/20250121000000_create_faqs_tutorials_blocked_users.sql`
2. Copy **ALL** the contents (Ctrl+A, then Ctrl+C)
3. Paste into the SQL Editor in Supabase

### Step 4: Run the SQL
1. Click the **"Run"** button (or press `Ctrl+Enter`)
2. Wait for "Success" message

### Step 5: Verify Tables Created
1. Click **"Table Editor"** in the left sidebar
2. You should see 3 new tables:
   - ✅ `faqs`
   - ✅ `tutorials`  
   - ✅ `blocked_users`

## That's it! 🎉

Now you can:
- Add FAQs in Owner Dashboard → FAQs tab
- Add Tutorials in Owner Dashboard → Tutorials tab
- Block users in Owner Dashboard → User Management tab

## Troubleshooting

**Error: "relation owner_accounts does not exist"**
- Make sure you have the `owner_accounts` table created first
- If not, create it with:
  ```sql
  CREATE TABLE IF NOT EXISTS public.owner_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```

**Error: "permission denied"**
- The RLS policies check if you're an owner
- Make sure your email is in the `owner_accounts` table
- Add it with:
  ```sql
  INSERT INTO public.owner_accounts (email) 
  VALUES ('your-email@example.com');
  ```

**Tables created but can't add FAQs/Tutorials**
- Check that your user email is in `owner_accounts` table
- Verify you're logged in as an owner in the app

## Need Help?

If you see any errors, copy the error message and check:
1. Did you copy the entire SQL file?
2. Is your email in the `owner_accounts` table?
3. Are you logged in as an owner?
