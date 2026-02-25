# How to Create Database Tables in Supabase

This guide will help you create the required tables for the Owner Dashboard features (FAQs, Tutorials, and Blocked Users).

## Option 1: Using Supabase Dashboard (Easiest)

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project

### Step 2: Open SQL Editor
1. Click on "SQL Editor" in the left sidebar
2. Click "New query"

### Step 3: Run the Migration
1. Copy the entire contents of `supabase/migrations/20250121000000_create_faqs_tutorials_blocked_users.sql`
2. Paste it into the SQL Editor
3. Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Step 4: Verify Tables Created
1. Go to "Table Editor" in the left sidebar
2. You should see three new tables:
   - `faqs`
   - `tutorials`
   - `blocked_users`

## Option 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Navigate to your project root
cd "C:\Users\Arewan\Documents\DUGMA\Test v2"

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

## Option 3: Manual Table Creation

If you prefer to create tables manually through the Supabase Dashboard:

### Create FAQs Table
1. Go to "Table Editor" → "New Table"
2. Table name: `faqs`
3. Add columns:
   - `id` (uuid, primary key, default: `gen_random_uuid()`)
   - `question_en` (text, required)
   - `answer_en` (text, required)
   - `question_ckb` (text, optional)
   - `answer_ckb` (text, optional)
   - `question_ar` (text, optional)
   - `answer_ar` (text, optional)
   - `order` (int4, default: 0)
   - `created_at` (timestamptz, default: `now()`)
   - `updated_at` (timestamptz, default: `now()`)

### Create Tutorials Table
1. Go to "Table Editor" → "New Table"
2. Table name: `tutorials`
3. Add columns:
   - `id` (uuid, primary key, default: `gen_random_uuid()`)
   - `title` (text, required)
   - `description` (text, optional)
   - `video_url` (text, required)
   - `order` (int4, default: 0)
   - `created_at` (timestamptz, default: `now()`)
   - `updated_at` (timestamptz, default: `now()`)

### Create Blocked Users Table
1. Go to "Table Editor" → "New Table"
2. Table name: `blocked_users`
3. Add columns:
   - `id` (uuid, primary key, default: `gen_random_uuid()`)
   - `user_id` (uuid, required, foreign key to `auth.users(id)`)
   - `blocked_at` (timestamptz, default: `now()`)
   - `blocked_by` (uuid, optional, foreign key to `auth.users(id)`)
   - `reason` (text, optional)
4. Add unique constraint on `user_id`

## Setting Up Row Level Security (RLS)

After creating the tables, you need to set up RLS policies:

### For FAQs and Tutorials:
1. Go to "Authentication" → "Policies"
2. Select the table (`faqs` or `tutorials`)
3. Create policies:
   - **SELECT**: Allow public read access
   - **INSERT/UPDATE/DELETE**: Only for owners (requires owner_accounts table check)

### For Blocked Users:
1. Go to "Authentication" → "Policies"
2. Select `blocked_users` table
3. Create policies:
   - **SELECT/INSERT/UPDATE/DELETE**: Only for owners

## Important Notes

1. **Owner Accounts**: The RLS policies check for owner status using the `owner_accounts` table. Make sure you have owner emails in that table.

2. **Testing**: After creating tables, test in the Owner Dashboard:
   - Try adding an FAQ
   - Try adding a Tutorial
   - Check if they appear in the main FAQ/Tutorial screens

3. **Permissions**: If you get permission errors, you may need to:
   - Check that your user email is in `owner_accounts` table
   - Verify RLS policies are correctly set up
   - Check that the policies allow your operations

## Troubleshooting

### Error: "relation does not exist"
- Make sure you ran the migration in the correct database
- Check that the table names are correct (case-sensitive)

### Error: "permission denied"
- Check RLS policies
- Verify you're logged in as an owner
- Check that `owner_accounts` table exists and has your email

### Error: "column does not exist"
- Make sure all columns were created correctly
- Check the migration file for typos

## Need Help?

If you encounter any issues:
1. Check the Supabase logs in the Dashboard
2. Verify the migration file syntax
3. Make sure you have the correct permissions in Supabase
