// ============================================================================
// Renders the student dashboard sidebar into the given element id.
// `active` is the nav key to highlight; `base` is the relative path back to
// /pages/student/ (used because this file is loaded from that folder already,
// so links here are relative to it).
// ============================================================================

function renderStudentSidebar(elId, active, base = "") {
  const el = document.getElementById(elId);
  if (!el) return;

  const items = [
    { key: "dashboard", label: "Dashboard", href: "dashboard.html", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" },
    { key: "my-courses", label: "My Courses", href: "my-courses.html", icon: "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" },
    { key: "wallet", label: "Wallet", href: "wallet.html", icon: "M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1 0-6h1.5m-9 8.25h9m-9 3.75h9m-9-11.25h9M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H5.625c-.621 0-1.125.504-1.125 1.125V19.5a1.5 1.5 0 0 0 1.5 1.5Z" },
    { key: "assignments", label: "Assignments", href: "assignments.html", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" },
    { key: "exercises", label: "Exercises", href: "exercises.html", icon: "m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h16.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" },
    { key: "quizzes", label: "Quizzes", href: "quizzes.html", icon: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" },
    { key: "live-classes", label: "Live Classes", href: "live-classes.html", icon: "M15.75 10.5 19.5 7.5v9l-3.75-3M4.5 18h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 13.5 6h-9A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18Z" },
    { key: "certificates", label: "Certificates", href: "certificates.html", icon: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286Z" },
    { key: "wishlist", label: "Wishlist", href: "wishlist.html", icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" },
    { key: "bookmarks", label: "Bookmarks", href: "bookmarks.html", icon: "M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" },
    { key: "messages", label: "Messages", href: "messages.html", icon: "M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" },
    { key: "notifications", label: "Notifications", href: "notifications.html", icon: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" },
    { key: "announcements", label: "Announcements", href: "announcements.html", icon: "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783m-.985-11.963a18.03 18.03 0 0 1-.59-4.59" },
    { key: "profile", label: "Profile & Settings", href: "profile.html", icon: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" },
  ];

  el.innerHTML = `
    <nav class="space-y-1">
      ${items
        .map(
          (i) => `
        <a href="${base}${i.href}" class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
            active === i.key ? "bg-purple-50 text-[#A435F0]" : "text-gray-600 hover:bg-gray-50"
          }">
          <svg class="w-4.5 h-4.5 shrink-0" style="width:18px;height:18px" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.7"><path stroke-linecap="round" stroke-linejoin="round" d="${i.icon}"/></svg>
          ${i.label}
        </a>`
        )
        .join("")}
    </nav>
  `;
}
