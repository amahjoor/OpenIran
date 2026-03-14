import { createClient } from "@supabase/supabase-js";

// Ensure environment variables are defined. 
// Fallback to local dev URLs if they aren't, to allow `npm run build` to pass.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"; // Fallback to auto-generated local anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
