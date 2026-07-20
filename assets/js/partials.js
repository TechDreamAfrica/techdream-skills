// ============================================================================
// TCP Partials — renders the site header/footer into #tcp-header / #tcp-footer
// and keeps the header in sync with auth state. `base` lets pages in
// subfolders (pages/, pages/admin/, pages/student/) point links correctly.
// ============================================================================

function tcpRenderHeader(base = "") {
  const el = document.getElementById("tcp-header");
  if (!el) return;
  el.innerHTML = `
    <header class="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <a href="${base}index.html" class="flex items-center gap-2 shrink-0">
          <span class="font-display font-bold text-lg tracking-tight text-[#1c1d1f]">THE CODING<br class="hidden"> PROFESSIONALS</span>
        </a>

        <div class="hidden md:flex flex-1 max-w-md">
          <form id="tcp-nav-search" class="w-full relative">
            <input type="search" name="q" placeholder="Search for courses"
              class="tcp-input pl-9 rounded-full !py-2" />
            <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/>
            </svg>
          </form>
        </div>

        <nav class="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-700 shrink-0">
          <a href="${base}courses.html" class="hover:text-[#A435F0]">Courses</a>
          <a href="${base}categories.html" class="hover:text-[#A435F0]">Categories</a>
          <a href="${base}pricing.html" class="hover:text-[#A435F0]">Pricing</a>
        </nav>

        <div id="tcp-header-auth" class="flex items-center gap-3 shrink-0">
          <!-- filled by JS below once session is known -->
        </div>

        <button id="tcp-mobile-toggle" class="lg:hidden text-gray-700" aria-label="Open menu">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/></path></svg>
        </button>
      </div>

      <div id="tcp-mobile-menu" class="hidden lg:hidden border-t border-gray-100 px-4 py-3 space-y-3">
        <form id="tcp-nav-search-mobile" class="relative">
          <input type="search" name="q" placeholder="Search for courses" class="tcp-input pl-9 rounded-full" />
          <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/></svg>
        </form>
        <a href="${base}courses.html" class="block text-sm font-medium text-gray-700">Courses</a>
        <a href="${base}categories.html" class="block text-sm font-medium text-gray-700">Categories</a>
        <a href="${base}pricing.html" class="block text-sm font-medium text-gray-700">Pricing</a>
        <div id="tcp-mobile-auth" class="pt-2 border-t border-gray-100 space-y-2"></div>
      </div>
    </header>
  `;

  document.getElementById("tcp-mobile-toggle").onclick = () => {
    document.getElementById("tcp-mobile-menu").classList.toggle("hidden");
  };

  [document.getElementById("tcp-nav-search"), document.getElementById("tcp-nav-search-mobile")].forEach((form) => {
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = new FormData(form).get("q");
      window.location.href = `${base}courses.html?q=${encodeURIComponent(q || "")}`;
    });
  });

  renderHeaderAuthState(base);
  window.tcpSupabase?.auth.onAuthStateChange(() => renderHeaderAuthState(base));
}

async function renderHeaderAuthState(base) {
  const authSlot = document.getElementById("tcp-header-auth");
  const mobileSlot = document.getElementById("tcp-mobile-auth");
  if (!authSlot) return;

  const session = await window.TcpAuth?.getSession();
  if (!session) {
    authSlot.innerHTML = `
      <a href="${base}login.html" class="text-sm font-semibold text-gray-800 hover:text-[#A435F0] hidden sm:inline">Log in</a>
      <a href="../register.html" class="tcp-btn-secondary text-sm !py-2">Sign up</a>
    `;
    if (mobileSlot)
      mobileSlot.innerHTML = `
        <a href="${base}login.html" class="block text-sm font-semibold">Log in</a>
        <a href="${base}register.html" class="block text-sm font-semibold text-[#A435F0]">Sign up</a>
      `;
    return;
  }

  const profile = await window.TcpAuth.getProfile();
  const initials = (profile?.fullname || session.user.email || "?").trim().charAt(0).toUpperCase();
  const dashHref = profile?.role === "admin" ? `${base}admin/dashboard.html` : `${base}student/dashboard.html`;

  authSlot.innerHTML = `
    <a href="${base}student/wishlist.html" class="hidden sm:inline text-gray-500 hover:text-[#A435F0]" aria-label="Wishlist">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg>
    </a>
    <a href="${base}student/notifications.html" class="hidden sm:inline text-gray-500 hover:text-[#A435F0]" aria-label="Notifications">
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></svg>
    </a>
    <div class="relative">
      <button id="tcp-avatar-btn" class="w-9 h-9 rounded-full bg-[#A435F0] text-white font-semibold text-sm flex items-center justify-center">
        ${initials}
      </button>
      <div id="tcp-avatar-menu" class="hidden absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-2 text-sm">
        <a href="${dashHref}" class="block px-4 py-2 hover:bg-gray-50">Dashboard</a>
        <a href="${base}student/profile.html" class="block px-4 py-2 hover:bg-gray-50">Profile & settings</a>
        <button id="tcp-logout-btn" class="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600">Log out</button>
      </div>
    </div>
  `;
  if (mobileSlot)
    mobileSlot.innerHTML = `
      <a href="${dashHref}" class="block text-sm font-semibold">Dashboard</a>
      <button id="tcp-logout-btn-mobile" class="block text-sm font-semibold text-red-600">Log out</button>
    `;

  document.getElementById("tcp-avatar-btn")?.addEventListener("click", () => {
    document.getElementById("tcp-avatar-menu").classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("tcp-avatar-menu");
    const btn = document.getElementById("tcp-avatar-btn");
    if (menu && !menu.classList.contains("hidden") && !menu.contains(e.target) && e.target !== btn) {
      menu.classList.add("hidden");
    }
  });
  const doLogout = async () => {
    await window.TcpAuth.logOut();
    window.tcpToast?.("You've been logged out.", "success");
    setTimeout(() => (window.location.href = `${base}index.html`), 600);
  };
  document.getElementById("tcp-logout-btn")?.addEventListener("click", doLogout);
  document.getElementById("tcp-logout-btn-mobile")?.addEventListener("click", doLogout);
}

function tcpRenderFooter(base = "") {
  const el = document.getElementById("tcp-footer");
  if (!el) return;
  el.innerHTML = `
    <footer class="bg-[#1c1d1f] text-gray-300 mt-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div class="col-span-2">
          <span class="font-display font-bold text-lg text-white">THE CODING PROFESSIONALS</span>
          <p class="text-sm text-gray-400 mt-3 max-w-xs">Practical, project-based courses built and taught by working software engineers.</p>
        </div>
        <div>
          <h4 class="text-white text-sm font-semibold mb-3">Learn</h4>
          <ul class="space-y-2 text-sm">
            <li><a href="${base}courses.html" class="hover:text-white">Courses</a></li>
            <li><a href="${base}categories.html" class="hover:text-white">Categories</a></li>
            <li><a href="${base}pricing.html" class="hover:text-white">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-white text-sm font-semibold mb-3">Company</h4>
          <ul class="space-y-2 text-sm">
            <li><a href="${base}about.html" class="hover:text-white">About</a></li>
            <li><a href="${base}blog.html" class="hover:text-white">Blog</a></li>
            <li><a href="${base}contact.html" class="hover:text-white">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-white text-sm font-semibold mb-3">Support</h4>
          <ul class="space-y-2 text-sm">
            <li><a href="${base}faq.html" class="hover:text-white">FAQ</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/10 py-5 text-center text-xs text-gray-500">
        © ${new Date().getFullYear()} The Coding Professionals. All rights reserved.
      </div>
    </footer>
  `;
}
