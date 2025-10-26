import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qxivrdhhjvuinhemdakv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4aXZyZGhoanZ1aW5oZW1kYWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MTEzMjksImV4cCI6MjA3Njk4NzMyOX0.cscK-IeOZvSdtSW_7t7hXu7Ei4ky08-6IqDzbjcYwp8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

