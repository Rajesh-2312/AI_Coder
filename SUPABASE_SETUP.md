# Supabase Setup for AI-Coder

## Step 1: Set Up Database Tables

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `supabase-schema.sql`

This will create:
- `projects` table - Stores user projects
- `model_downloads` table - Tracks AI model downloads
- `training_sessions` table - Stores AI training data
- Row Level Security (RLS) policies for all tables

## Step 2: Configure Environment Variables

Add these to your `.env` file or Supabase environment variables:

```
VITE_SUPABASE_URL=https://qxivrddhjvuinhemdakv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4aXZyZGhoanZ1aW5oZW1kYWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTEzMjksImV4cCI6MjA3Njk4NzMyOX0.cscK-IeOZvSdtSW_7t7hXu7Ei4ky08-6IqDzbjcYwp8
```

## Step 3: Features

### Automatic Project Saving
When a user creates a project with AI:
- Project metadata is saved to Supabase
- Files are stored as JSON
- Project status (active/archived/deleted) is tracked
- Running port and URL are recorded

### Model Download Tracking
- First download: Model is saved to Supabase
- Subsequent logins: User doesn't need to download again
- Model status is tracked per user

### Benefits
- ✅ Persistent storage across sessions
- ✅ Multi-user support with RLS
- ✅ Project history and versioning
- ✅ Secure data isolation per user
- ✅ No local storage dependencies

## Step 4: Usage

The AI project manager automatically:
1. Saves projects when created
2. Loads projects on user login
3. Updates project status
4. Tracks model downloads

No additional code needed - it's already integrated!

## Database Schema

### projects
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `name` - Project name
- `description` - Project description
- `files` - JSONB with project files
- `status` - active/archived/deleted
- `port` - Running port
- `url` - Project URL
- `metadata` - Additional metadata

### model_downloads
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `model_name` - Name of the model
- `model_path` - File path
- `file_size` - Size in bytes
- `download_status` - pending/completed
- `downloaded_at` - Timestamp

### training_sessions
- `id` - UUID primary key
- `user_id` - Foreign key to auth.users
- `session_name` - Session identifier
- `pattern_type` - AI pattern type
- `confidence_score` - ML confidence
- `training_data` - JSONB training data

