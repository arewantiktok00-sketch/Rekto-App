# Owner Account Setup

## How to Add Owner Access

To see the "ADMIN" section in the Profile page, your email must be added to the `owner_accounts` table in Supabase.

### Step 1: Check Your Email
Your current email is shown in the debug section at the bottom of the Profile page (in development mode).

### Step 2: Add Email to owner_accounts Table

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Table Editor
3. Find or create the `owner_accounts` table
4. Add a row with your email:
   ```sql
   INSERT INTO owner_accounts (email) 
   VALUES ('your-email@example.com');
   ```

**Option B: Via SQL Editor**
```sql
-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS owner_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add your email
INSERT INTO owner_accounts (email) 
VALUES ('owner@rekto.net')
ON CONFLICT (email) DO NOTHING;
```

### Step 3: Verify
1. Refresh the Profile page
2. Check the debug section (in dev mode) - it should show `Is Owner: Yes`
3. The ADMIN section should appear above the Logout button

### Table Structure
The `owner_accounts` table should have:
- `id` (UUID, primary key)
- `email` (TEXT, unique, not null)
- `created_at` (TIMESTAMP, optional)

### Troubleshooting
- **Not seeing ADMIN section?**
  - Check console logs for `[OwnerAuth]` messages
  - Verify your email matches exactly (case-sensitive)
  - Check Supabase RLS policies allow reading from `owner_accounts`
  
- **Console shows error?**
  - Table might not exist - create it using SQL above
  - RLS policy might be blocking - check Supabase policies
  - Email format might be wrong - check exact email in debug section
