// ============================================================================
// TCP Auth Kit — sign up, log in, log out, password reset, session guards.
// Depends on supabase-client.js and ui.js being loaded first.
// ============================================================================

const TcpAuth = (function () {
  const sb = () => window.tcpSupabase;

  async function signUp({ fullname, email, password, role = "student" }) {
    const { data, error } = await sb().auth.signUp({
      email,
      password,
      options: {
        data: { fullname, role },
        emailRedirectTo: window.location.origin + "/pages/login.html",
      },
    });
    if (error) throw error;
    return data;
  }

  async function logIn({ email, password, rememberMe = true }) {
    const { data, error } = await sb().auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Supabase JS persists sessions in localStorage by default (equivalent to
    // "remember me"). When rememberMe is false we clear on tab close instead.
    if (!rememberMe) {
      sessionStorage.setItem("tcp_session_only", "1");
    } else {
      sessionStorage.removeItem("tcp_session_only");
    }
    return data;
  }

  async function logOut() {
    const { error } = await sb().auth.signOut();
    if (error) throw error;
  }

  async function sendPasswordReset(email) {
    const { error } = await sb().auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/pages/reset-password.html",
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword) {
    const { error } = await sb().auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function getSession() {
    const { data } = await sb().auth.getSession();
    return data.session;
  }

  async function getProfile() {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await sb().from("profiles").select("*").eq("id", session.user.id).single();
    if (error) return null;
    return data;
  }

  /** Redirects to login if not authenticated. Optionally restrict to a role. */
  async function requireAuth({ role = null, redirectTo = "/pages/login.html" } = {}) {
    const session = await getSession();
    if (!session) {
      window.location.href = redirectTo;
      return null;
    }
    const profile = await getProfile();
    if (profile && profile.is_suspended) {
      await logOut();
      window.location.href = redirectTo + "?suspended=1";
      return null;
    }
    if (role) {
      const allowed = Array.isArray(role) ? role : [role];
      if (!profile || !allowed.includes(profile.role)) {
        window.location.href = "/index.html";
        return null;
      }
    }
    return profile;
  }

  function friendlyError(error) {
    const msg = error?.message || "Something went wrong. Please try again.";
    const map = {
      "Invalid login credentials": "Incorrect email or password.",
      "User already registered": "An account with this email already exists.",
      "Password should be at least 6 characters": "Password must be at least 6 characters.",
    };
    return map[msg] || msg;
  }

  return { signUp, logIn, logOut, sendPasswordReset, updatePassword, getSession, getProfile, requireAuth, friendlyError };
})();

window.TcpAuth = TcpAuth;
