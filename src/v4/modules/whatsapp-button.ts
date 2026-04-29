/**
 * Meetergo v4 — WhatsApp click-to-chat widget.
 *
 * Renders a floating chat bubble that, when clicked, expands into a small
 * "agent" popup with a pre-typed message and a green "Start Chat" CTA.
 * Tapping the CTA opens `https://wa.me/<phone>?text=<urlencoded>` — the
 * universal WhatsApp deep-link spec — in a new tab. On mobile, this opens
 * the WhatsApp app via universal link; on desktop, it falls through to
 * web.whatsapp.com or WhatsApp Desktop.
 *
 * Three operating modes, in order of precedence:
 *   1. **Inline**           — every value passed in the config wins.
 *   2. **Inline + hosted**  — when `companyId` is set we GET the public
 *                             widget config and merge missing fields.
 *   3. **Hosted only**      — `companyId` set, no inline values: the
 *                             dashboard fully controls the widget.
 *
 * No external CSS file, no Shadow DOM. We append a single `<style>` tag
 * scoped to `mg-wa-*` class names so the widget can't accidentally
 * leak styling into the host site.
 */

import { errorHandler } from "../utils/error-handler.js";
import type { WhatsappButtonConfig } from "../types/index.js";

const DEFAULT_COLOR = "#25D366";
const DEFAULT_POSITION: NonNullable<WhatsappButtonConfig["position"]> =
  "bottom-right";
const DEFAULT_CTA = "Start chat";
const DEFAULT_GREETING = "Hi 👋  How can we help you today?";
const DEFAULT_PREFILLED = "Hi! I have a question about…";
const DEFAULT_AGENT_NAME = "Support";
const DEFAULT_AGENT_ROLE = "Customer support";
/** Default meetergo API base; overridable via the namespace `origin`. */
const DEFAULT_ORIGIN = "https://api.meetergo.com";

export class WhatsappButton {
  private readonly ns: string;
  private root: HTMLElement | null = null;
  private styleEl: HTMLStyleElement | null = null;
  private apiOrigin: string;

  constructor(ns: string, apiOrigin?: string) {
    this.ns = ns;
    this.apiOrigin = apiOrigin ?? DEFAULT_ORIGIN;
  }

  /**
   * Bootstrap the widget. When `companyId` is set we fetch the hosted
   * config first; otherwise we render straight from the inline values.
   */
  async create(config: WhatsappButtonConfig): Promise<void> {
    try {
      this.destroy();
      let merged: WhatsappButtonConfig = { ...config };
      if (config.companyId) {
        const hosted = await this.fetchHostedConfig(config.companyId);
        if (hosted) {
          // Inline values take precedence — they're what the customer
          // explicitly hard-coded into their page. Hosted fills the gaps.
          merged = { ...hosted, ...config };
        }
      }
      if (merged.disabled) return;

      const showAfter = merged.showAfterMs ?? 0;
      if (showAfter > 0) {
        window.setTimeout(() => this.render(merged), showAfter);
      } else {
        this.render(merged);
      }
    } catch (err) {
      errorHandler.handleError({
        message: "Failed to create WhatsApp widget",
        level: "error",
        ns: this.ns,
        error: err as Error,
      });
    }
  }

  destroy(): void {
    this.root?.parentNode?.removeChild(this.root);
    this.root = null;
    this.styleEl?.parentNode?.removeChild(this.styleEl);
    this.styleEl = null;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async fetchHostedConfig(
    companyId: string,
  ): Promise<WhatsappButtonConfig | null> {
    try {
      const url = `${this.apiOrigin.replace(/\/$/, "")}/integrations/whatsapp/public/widget/${encodeURIComponent(companyId)}`;
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) return null;
      const data = (await res.json()) as WhatsappButtonConfig;
      return data;
    } catch {
      // Network/CORS errors aren't fatal — we just skip hosted hydration
      // and fall back to whatever inline values we have.
      return null;
    }
  }

  private render(cfg: WhatsappButtonConfig): void {
    if (!cfg.phoneNumber) {
      // Without a number to chat with there's nothing useful to render.
      // Don't throw — silently no-op so a half-configured site doesn't
      // crash on every page view.
      return;
    }

    this.injectStyles(cfg);

    const root = document.createElement("div");
    root.id = cfg.domId ?? `mg-${this.ns}-wa-root`;
    root.className = `mg-wa-root mg-wa-pos-${cfg.position ?? DEFAULT_POSITION}`;

    // Popup (hidden by default)
    const popup = this.buildPopup(cfg);
    root.appendChild(popup);

    // FAB
    const fab = this.buildFab(cfg);
    fab.addEventListener("click", () => {
      popup.classList.toggle("mg-wa-popup-open");
    });
    root.appendChild(fab);

    document.body.appendChild(root);
    this.root = root;
  }

  private buildFab(cfg: WhatsappButtonConfig): HTMLElement {
    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "mg-wa-fab";
    fab.style.backgroundColor = cfg.primaryColor ?? DEFAULT_COLOR;
    fab.setAttribute("aria-label", cfg.ctaLabel ?? DEFAULT_CTA);
    fab.innerHTML = whatsappIconSvg();
    return fab;
  }

  private buildPopup(cfg: WhatsappButtonConfig): HTMLElement {
    const popup = document.createElement("div");
    popup.className = "mg-wa-popup";

    // Header
    const header = document.createElement("div");
    header.className = "mg-wa-popup-header";
    header.style.backgroundColor = cfg.primaryColor ?? DEFAULT_COLOR;

    const avatar = document.createElement("div");
    avatar.className = "mg-wa-avatar";
    if (cfg.agentAvatarUrl) {
      const img = document.createElement("img");
      img.src = cfg.agentAvatarUrl;
      img.alt = cfg.agentName ?? DEFAULT_AGENT_NAME;
      img.onerror = () => {
        // Fall back to initials if the image fails to load — common with
        // expired CDN URLs.
        avatar.innerHTML = "";
        avatar.textContent = initials(cfg.agentName ?? DEFAULT_AGENT_NAME);
        avatar.classList.add("mg-wa-avatar-initials");
      };
      avatar.appendChild(img);
    } else {
      avatar.textContent = initials(cfg.agentName ?? DEFAULT_AGENT_NAME);
      avatar.classList.add("mg-wa-avatar-initials");
    }
    header.appendChild(avatar);

    const headerText = document.createElement("div");
    headerText.className = "mg-wa-header-text";
    const name = document.createElement("div");
    name.className = "mg-wa-agent-name";
    name.textContent = cfg.agentName ?? DEFAULT_AGENT_NAME;
    const role = document.createElement("div");
    role.className = "mg-wa-agent-role";
    // Plain subtitle — no leading status dot. The dot looked like an
    // unintentional bullet point on most renders, especially against
    // the bold WhatsApp green header.
    role.textContent = cfg.agentRole ?? DEFAULT_AGENT_ROLE;
    headerText.appendChild(name);
    headerText.appendChild(role);
    header.appendChild(headerText);

    const close = document.createElement("button");
    close.type = "button";
    close.className = "mg-wa-close";
    close.innerHTML = "&times;";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      popup.classList.remove("mg-wa-popup-open");
    });
    header.appendChild(close);
    popup.appendChild(header);

    // Greeting bubble
    const body = document.createElement("div");
    body.className = "mg-wa-popup-body";
    const bubble = document.createElement("div");
    bubble.className = "mg-wa-bubble";
    bubble.textContent = cfg.greetingMessage ?? DEFAULT_GREETING;
    body.appendChild(bubble);
    popup.appendChild(body);

    // CTA region — branches on input mode. Quick-replies skips the
    // single-CTA path entirely and renders a stack of chips, each
    // carrying its own pre-filled message.
    const cta = document.createElement("div");
    cta.className = "mg-wa-popup-cta";

    // GDPR consent (optional). When `gdprNotice` is set we render a
    // checkbox + label and gate every send action behind it — Meta's
    // click-to-chat doesn't itself store anything, but the message is
    // sent on the visitor's behalf via an outbound URL, which most EU
    // privacy regimes treat as data sharing. Locking sends until
    // consent is the pragmatic, low-friction way to comply.
    const gdprNotice = cfg.gdprNotice?.trim();
    let consentBox: HTMLInputElement | null = null;
    if (gdprNotice) {
      const wrapper = document.createElement("label");
      wrapper.className = "mg-wa-gdpr";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "mg-wa-gdpr-cb";
      consentBox = cb;
      const text = document.createElement("span");
      // Strip any HTML so a malicious notice can't inject script tags
      // into a customer site. The optional policy link is rendered as a
      // separate anchor we control fully.
      text.textContent = gdprNotice;
      wrapper.appendChild(cb);
      wrapper.appendChild(text);
      if (cfg.gdprPolicyUrl) {
        wrapper.appendChild(document.createTextNode(" "));
        const a = document.createElement("a");
        a.href = cfg.gdprPolicyUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "↗";
        a.className = "mg-wa-gdpr-link";
        wrapper.appendChild(a);
      }
      cta.appendChild(wrapper);
    }

    const isConsentBlocked = () => Boolean(consentBox && !consentBox.checked);

    const usingQuickReplies =
      cfg.inputMode === "quick-replies" && (cfg.quickReplies?.length ?? 0) > 0;

    if (usingQuickReplies) {
      // Quick-replies mode: render one card-style chip per option. Each
      // chip carries a bold title (the label) and a small description
      // line (the message preview), with a `→` indicator on the right —
      // pattern lifted straight from how Intercom / Tidio render their
      // saved-reply suggestions, which read instantly on a phone screen.
      const list = document.createElement("div");
      list.className = "mg-wa-quick-list";
      const chipColor = cfg.primaryColor ?? DEFAULT_COLOR;
      const chipButtons: HTMLButtonElement[] = [];
      for (const reply of cfg.quickReplies ?? []) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "mg-wa-quick-chip";

        const text = document.createElement("div");
        text.className = "mg-wa-quick-text";

        const title = document.createElement("div");
        title.className = "mg-wa-quick-title";
        title.textContent = reply.label;
        text.appendChild(title);

        if (reply.message) {
          const desc = document.createElement("div");
          desc.className = "mg-wa-quick-desc";
          desc.textContent = reply.message;
          text.appendChild(desc);
        }

        // Solid filled arrow circle on the right — reads as the
        // "send" affordance, mirrors the colour of the FAB so visitors
        // see the chip and the FAB share a visual language.
        const arrow = document.createElement("span");
        arrow.className = "mg-wa-quick-arrow";
        arrow.style.backgroundColor = chipColor;
        arrow.setAttribute("aria-hidden", "true");
        arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>`;

        chip.appendChild(text);
        chip.appendChild(arrow);
        chip.addEventListener("click", () => {
          if (isConsentBlocked()) return;
          const url = buildWaMeUrl(cfg.phoneNumber!, reply.message ?? "");
          window.open(url, "_blank", "noopener,noreferrer");
        });
        list.appendChild(chip);
        chipButtons.push(chip);
      }
      // Lock chips behind consent in the same way the single CTA is.
      if (consentBox) {
        for (const c of chipButtons) c.disabled = true;
        consentBox.addEventListener("change", () => {
          const blocked = !consentBox!.checked;
          for (const c of chipButtons) c.disabled = blocked;
        });
      }
      cta.appendChild(list);
    } else {
      // Free-text mode (default). Show the draft preview + single CTA.
      const draft = document.createElement("div");
      draft.className = "mg-wa-draft";
      draft.textContent = cfg.prefilledMessage ?? DEFAULT_PREFILLED;
      // Insert draft BEFORE the consent label if it was already
      // appended above — keeps reading order: draft → consent → CTA.
      cta.insertBefore(draft, cta.firstChild);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "mg-wa-cta-btn";
      button.style.backgroundColor = cfg.primaryColor ?? DEFAULT_COLOR;
      button.innerHTML = `${whatsappIconSvg(16)}<span>${escapeHtml(cfg.ctaLabel ?? DEFAULT_CTA)}</span>`;
      if (consentBox) {
        // Initially disabled; the CTA opacity/cursor is handled in CSS via
        // `:disabled`. Toggle on every checkbox change so the button
        // unlocks the moment consent is given.
        button.disabled = true;
        consentBox.addEventListener("change", () => {
          button.disabled = !consentBox!.checked;
        });
      }
      button.addEventListener("click", () => {
        if (isConsentBlocked()) return;
        const url = buildWaMeUrl(
          cfg.phoneNumber!,
          cfg.prefilledMessage ?? "",
        );
        window.open(url, "_blank", "noopener,noreferrer");
      });
      cta.appendChild(button);
    }

    popup.appendChild(cta);
    return popup;
  }

  private injectStyles(cfg: WhatsappButtonConfig): void {
    if (this.styleEl) return;
    const style = document.createElement("style");
    style.id = `mg-${this.ns}-wa-styles`;
    style.textContent = wgStyles(cfg.primaryColor ?? DEFAULT_COLOR);
    document.head.appendChild(style);
    this.styleEl = style;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the canonical WhatsApp click-to-chat URL.
 *
 * `wa.me` requires a digits-only phone number — leading `+`, spaces,
 * parentheses, and `(0)` trunk prefixes all silently break the link. We
 * normalise here so customers can paste in formatted numbers (e.g.
 * `+49 (0) 30 12345678`) and still get a working CTA.
 */
function buildWaMeUrl(phoneNumber: string, message: string): string {
  const digits = phoneNumber.replace(/[^\d]/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function whatsappIconSvg(size = 28): string {
  // Inline SVG so the widget has zero external asset dependencies.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`;
}

/**
 * Inline stylesheet for the widget. Class names prefixed with `mg-wa-`
 * so they can never collide with host-site CSS. Avoids `!important`
 * except where host resets are likely to bite (e.g. button defaults).
 */
function wgStyles(_color: string): string {
  return `
    .mg-wa-root {
      position: fixed;
      z-index: 2147483600;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
    }
    .mg-wa-pos-bottom-right { right: 16px; bottom: 16px; }
    .mg-wa-pos-bottom-left  { left: 16px;  bottom: 16px; }
    .mg-wa-pos-top-right    { right: 16px; top: 16px; }
    .mg-wa-pos-top-left     { left: 16px;  top: 16px; }

    .mg-wa-fab {
      width: 56px; height: 56px;
      border-radius: 9999px;
      border: 0;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(0,0,0,0.18);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s ease;
    }
    .mg-wa-fab:hover { transform: scale(1.05); }

    .mg-wa-popup {
      position: absolute;
      width: 304px;
      max-width: calc(100vw - 32px);
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.2);
      opacity: 0;
      transform: translateY(8px);
      pointer-events: none;
      transition: opacity 0.18s ease, transform 0.18s ease;
    }
    .mg-wa-pos-bottom-right .mg-wa-popup { right: 0; bottom: 72px; }
    .mg-wa-pos-bottom-left  .mg-wa-popup { left: 0;  bottom: 72px; }
    .mg-wa-pos-top-right    .mg-wa-popup { right: 0; top: 72px; }
    .mg-wa-pos-top-left     .mg-wa-popup { left: 0;  top: 72px; }
    .mg-wa-popup-open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .mg-wa-popup-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      color: #fff;
    }
    .mg-wa-avatar {
      width: 40px; height: 40px;
      border-radius: 9999px;
      overflow: hidden;
      flex-shrink: 0;
      background: rgba(255,255,255,0.25);
      display: flex; align-items: center; justify-content: center;
      font-weight: 600;
      font-size: 14px;
      box-shadow: inset 0 0 0 2px rgba(255,255,255,0.3);
    }
    .mg-wa-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .mg-wa-avatar-initials { color: #fff; }
    .mg-wa-header-text { min-width: 0; flex: 1; }
    .mg-wa-agent-name {
      font-weight: 600;
      font-size: 14px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mg-wa-agent-role {
      font-size: 12px;
      opacity: 0.9;
      line-height: 1.3;
    }
    .mg-wa-close {
      margin-left: auto;
      background: transparent;
      border: 0;
      color: rgba(255,255,255,0.85);
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
    }
    .mg-wa-close:hover { background: rgba(255,255,255,0.18); }

    .mg-wa-popup-body {
      background: #e5ddd5;
      padding: 16px;
    }
    .mg-wa-bubble {
      background: #fff;
      color: #1f2937;
      padding: 8px 12px;
      border-radius: 14px 14px 14px 4px;
      max-width: 90%;
      line-height: 1.4;
      box-shadow: 0 1px 1px rgba(0,0,0,0.08);
      white-space: pre-wrap;
    }

    .mg-wa-popup-cta {
      background: #fff;
      padding: 12px;
      border-top: 1px solid #f1f5f9;
    }
    .mg-wa-draft {
      background: #f8fafc;
      color: #6b7280;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      margin-bottom: 8px;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .mg-wa-cta-btn {
      width: 100%;
      border: 0;
      color: #fff;
      padding: 9px 14px;
      border-radius: 9999px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 14px;
    }
    .mg-wa-cta-btn:hover { filter: brightness(0.95); }
    .mg-wa-cta-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      filter: none;
    }

    .mg-wa-gdpr {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 10px;
      line-height: 1.4;
      cursor: pointer;
    }
    .mg-wa-gdpr-cb {
      margin: 2px 0 0 0;
      flex-shrink: 0;
      cursor: pointer;
    }
    .mg-wa-gdpr-link {
      color: #2563eb;
      text-decoration: none;
    }
    .mg-wa-gdpr-link:hover { text-decoration: underline; }

    .mg-wa-quick-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .mg-wa-quick-chip {
      width: 100%;
      background: #fff;
      border: 1px solid #e5e7eb;
      color: #111827;
      padding: 10px 12px;
      border-radius: 12px;
      text-align: left;
      cursor: pointer;
      line-height: 1.3;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      transition: border-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;
    }
    .mg-wa-quick-chip:hover {
      border-color: #d1d5db;
      box-shadow: 0 4px 10px rgba(0,0,0,0.08);
      transform: translateY(-1px);
    }
    .mg-wa-quick-chip:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #fff;
      box-shadow: none;
      transform: none;
    }
    .mg-wa-quick-text { flex: 1; min-width: 0; }
    .mg-wa-quick-title {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mg-wa-quick-desc {
      font-size: 11px;
      color: #4b5563;
      margin-top: 2px;
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .mg-wa-quick-arrow {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 9999px;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.12s ease;
    }
    .mg-wa-quick-chip:hover .mg-wa-quick-arrow {
      transform: translateX(2px);
    }
  `;
}
