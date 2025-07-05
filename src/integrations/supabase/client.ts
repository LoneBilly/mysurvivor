import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://odnnuqgkkzhmkxfafzhp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kbm51cWdra3pobWt4ZmFmemhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMzA3NDMsImV4cCI6MjA2NjcwNjc0M30.OuDofuERpko4EuLyrnsAFr9m0g611PgRvQfD2McM790'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)