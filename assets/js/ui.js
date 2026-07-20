// ============================================================================
// TCP UI Kit — toasts, modals, confirm dialogs, skeleton loaders, empty states
// Pure vanilla JS. Include after ui.css and a #tcp-toast-root / #tcp-modal-root
// element exist in the page (injected automatically on load if missing).
// ============================================================================

(function () {
  function ensureRoots() {
    if (!document.getElementById("tcp-toast-root")) {
      const root = document.createElement("div");
      root.id = "tcp-toast-root";
      root.className = "fixed z-[100] top-4 right-4 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm";
      document.body.appendChild(root);
    }
    if (!document.getElementById("tcp-modal-root")) {
      const root = document.createElement("div");
      root.id = "tcp-modal-root";
      document.body.appendChild(root);
    }
  }

  const ICONS = {
    success: '<svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>',
    error: '<svg class="w-5 h-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>',
    info: '<svg class="w-5 h-5 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/></svg>',
    warning: '<svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>',
  };

  /** Show a toast notification. type: success | error | info | warning */
  window.tcpToast = function (message, type = "info", duration = 4000) {
    ensureRoots();
    const root = document.getElementById("tcp-toast-root");
    const el = document.createElement("div");
    el.className =
      "flex items-start gap-3 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 pointer-events-auto animate-[tcp-slide-in_0.25s_ease-out]";
    el.innerHTML = `
      ${ICONS[type] || ICONS.info}
      <p class="text-sm text-gray-800 leading-snug flex-1">${message}</p>
      <button class="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Dismiss">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
      </button>
    `;
    el.querySelector("button").onclick = () => el.remove();
    root.appendChild(el);
    if (duration > 0) setTimeout(() => el.remove(), duration);
  };

  /** Open a modal. Returns the modal element so caller can close it manually if needed. */
  window.tcpModal = function ({ title, bodyHtml, footerHtml, onClose } = {}) {
    ensureRoots();
    const root = document.getElementById("tcp-modal-root");
    const overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4 animate-[tcp-fade-in_0.15s_ease-out]";
    overlay.innerHTML = `
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="text-lg font-semibold text-gray-900">${title || ""}</h3>
          <button data-close class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="px-6 py-5">${bodyHtml || ""}</div>
        ${footerHtml ? `<div class="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">${footerHtml}</div>` : ""}
      </div>
    `;
    function close() {
      overlay.remove();
      if (onClose) onClose();
    }
    overlay.querySelector("[data-close]").onclick = close;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    root.appendChild(overlay);
    overlay.close = close;
    return overlay;
  };

  /** Confirmation dialog. Returns a Promise<boolean>. */
  window.tcpConfirm = function ({ title = "Are you sure?", message = "", confirmLabel = "Confirm", danger = false } = {}) {
    return new Promise((resolve) => {
      const modal = window.tcpModal({
        title,
        bodyHtml: `<p class="text-sm text-gray-600">${message}</p>`,
        footerHtml: `
          <button data-cancel class="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Cancel</button>
          <button data-confirm class="px-4 py-2 text-sm font-medium rounded-lg text-white ${
            danger ? "bg-red-600 hover:bg-red-700" : "bg-[#A435F0] hover:bg-[#8710d8]"
          }">${confirmLabel}</button>
        `,
      });
      modal.querySelector("[data-cancel]").onclick = () => {
        modal.close();
        resolve(false);
      };
      modal.querySelector("[data-confirm]").onclick = () => {
        modal.close();
        resolve(true);
      };
    });
  };

  /** Return skeleton card HTML — n repeats. */
  window.tcpSkeletonCards = function (n = 3) {
    return Array.from({ length: n })
      .map(
        () => `
        <div class="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
          <div class="h-40 bg-gray-200"></div>
          <div class="p-4 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
            <div class="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>`
      )
      .join("");
  };

  /** Return empty-state block HTML. */
  window.tcpEmptyState = function ({ icon = "inbox", title = "Nothing here yet", message = "", actionLabel, actionOnClick } = {}) {
    return `
      <div class="flex flex-col items-center justify-center text-center py-16 px-4">
        <div class="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-4">
          <svg class="w-7 h-7 text-[#A435F0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5v9a2.25 2.25 0 0 1-2.25 2.25h-12A2.25 2.25 0 0 1 3.75 16.5v-9m16.5 0a2.25 2.25 0 0 0-2.25-2.25h-12A2.25 2.25 0 0 0 3.75 7.5m16.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.82 9.66a2.25 2.25 0 0 1-1.07-1.916V7.5"/></svg>
        </div>
        <h3 class="text-base font-semibold text-gray-900">${title}</h3>
        ${message ? `<p class="text-sm text-gray-500 mt-1 max-w-xs">${message}</p>` : ""}
        ${actionLabel ? `<button id="tcp-empty-action" class="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-[#A435F0] text-white hover:bg-[#8710d8]">${actionLabel}</button>` : ""}
      </div>
    `;
  };

  document.addEventListener("DOMContentLoaded", ensureRoots);
})();
