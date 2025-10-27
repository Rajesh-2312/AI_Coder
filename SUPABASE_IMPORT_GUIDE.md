# How to Import SQL Schema into Supabase

## Step-by-Step Guide

### 1. Open Supabase Dashboard
- Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Sign in with your account
- Select your project (or create a new one)

### 2. Navigate to SQL Editor
- In the left sidebar, click on **"SQL Editor"**
- You'll see the SQL query editor

### 3. Import the Schema
You have two options:

#### Option A: Copy and Paste
1. Open `supabase-schema.sql` in your project
2. Copy the entire contents (Ctrl+A, Ctrl+C)
3. Paste into the Supabase SQL Editor
4. Click **"Run"** button (or press Ctrl+Enter)

#### Option B: Upload File
1. Click **"New Query"** in the SQL Editor
2. Click **"Upload"** button
3. Select the `supabase-schema.sql` file
4. Click **"Run"**

### 4. Verify Tables Created
After running the SQL:
1. Go to **"Table Editor"** in the left sidebar
2. You should see three new tables:
   - `projects`
   - `model_downloads`
   - `training_sessions`

### 5. Verify RLS (Row Level Security)
1. Go to **"Authentication"** > **"Policies"**
2. You should see policies for each table
3. These ensure users can only access their own data

## What This Schema Does

### Projects Table
Stores AI-generated projects with:
- Project name and description
- Files (as JSON)
- Running port and URL
- Status (active/archived/deleted)
- Timestamps

### Model Downloads Table
Tracks AI model downloads per user:
- Model name and path
- File size
- Download status
- Timestamps

### Training Sessions Table
Stores AI training data:
- Session name and type
- Confidence scores
- Training patterns
- Timestamps

## Row Level Security (RLS)
All tables have RLS enabled, meaning:
- Users can only see their own data
- Users can only modify their own data
- Database enforces security automatically

## Automatic Timestamps
The `updated_at` column is automatically updated via triggers when data changes.

---

**Important:** After importing, refresh your AI-Coder app to start using Supabase storage!

