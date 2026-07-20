console.log("supabase-client.js loaded");

const SUPABASE_URL = "https://qhtwqsggieorguusiorb.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_bZ6cinqYNBODp8EJZts_gw_42d_Rxd-";

window.tcpSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

console.log("tcpSupabase created:", window.tcpSupabase);