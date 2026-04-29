/**
 * Meetergo Embed SDK v4 - Type Definitions
 *
 * All public types, interfaces, and discriminated unions for the v4 SDK.
 */

// ─── Primitive Utility Types ──────────────────────────────────────────────────

export type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type SidebarPosition = "left" | "right";
export type ButtonAnimation = "pulse" | "bounce" | "slide-in" | "none";
export type ColorScheme = "light" | "dark" | "auto";
export type IframeAlignment = "left" | "center" | "right";
export type EmbedLayout = "modal" | "sidebar" | "inline";

// ─── Prefill ──────────────────────────────────────────────────────────────────

export interface MeetergoPrefill {
  firstname?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
  timezone?: string;
  locale?: string;
  /** Allow arbitrary custom fields */
  [key: string]: string | undefined;
}

// ─── Booking Data ─────────────────────────────────────────────────────────────

export interface BookingSuccessfulData {
  appointmentId?: string;
  secret?: string;
  attendeeEmail?: string;
  bookingType?: "doubleOptIn" | "requireHostConfirmation";
  provisionalBookingId?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  eventTypeId?: string;
  status?: string;
  uid?: string;
  videoCallUrl?: string;
}

// ─── Theme / CSS Variables ───────────────────────────────────────────────────

export interface ThemeTokens {
  "--mg-brand"?: string;
  "--mg-brand-hover"?: string;
  "--mg-brand-text"?: string;
  "--mg-bg"?: string;
  "--mg-bg-overlay"?: string;
  "--mg-text"?: string;
  "--mg-text-muted"?: string;
  "--mg-radius"?: string;
  "--mg-font"?: string;
  "--mg-shadow"?: string;
  "--mg-border"?: string;
  /** Allow arbitrary CSS variables */
  [key: string]: string | undefined;
}

export interface PerThemeTokens {
  light?: ThemeTokens;
  dark?: ThemeTokens;
}

// ─── UI Config (live updatable) ───────────────────────────────────────────────

export interface UiConfig {
  theme?: ColorScheme;
  cssVars?: ThemeTokens;
  cssVarsPerTheme?: PerThemeTokens;
  /** Remove the event type detail panel */
  hideEventTypeDetails?: boolean;
  /** Background for the booker body */
  bodyBackground?: string;
}

// ─── Events (V2, discriminated unions) ───────────────────────────────────────

export interface MeetergoEventEnvelope<T = unknown> {
  event: string;
  namespace: string;
  data: T;
  ts: number;
}

export interface LinkReadyEvent extends MeetergoEventEnvelope<Record<string, never>> {
  event: "linkReady";
}

export interface LinkFailedEvent
  extends MeetergoEventEnvelope<{ code: number; msg: string; url: string }> {
  event: "linkFailed";
}

export interface BookingSuccessfulEvent extends MeetergoEventEnvelope<BookingSuccessfulData> {
  event: "bookingSuccessful";
}

export interface BookingCancelledEvent
  extends MeetergoEventEnvelope<{ appointmentId?: string }> {
  event: "bookingCancelled";
}

export interface BookingRescheduledEvent extends MeetergoEventEnvelope<BookingSuccessfulData> {
  event: "bookingRescheduled";
}

export interface ModalOpenedEvent extends MeetergoEventEnvelope<{ link: string }> {
  event: "modalOpened";
}

export interface ModalClosedEvent extends MeetergoEventEnvelope<Record<string, never>> {
  event: "modalClosed";
}

export interface SidebarOpenedEvent extends MeetergoEventEnvelope<{ position: SidebarPosition }> {
  event: "sidebarOpened";
}

export interface SidebarClosedEvent extends MeetergoEventEnvelope<{ position: SidebarPosition }> {
  event: "sidebarClosed";
}

export interface VideoPlayEvent extends MeetergoEventEnvelope<{ videoId: string }> {
  event: "videoPlay";
}

export interface VideoPauseEvent extends MeetergoEventEnvelope<{ videoId: string }> {
  event: "videoPause";
}

export interface VideoExpandedEvent extends MeetergoEventEnvelope<{ videoId: string }> {
  event: "videoExpanded";
}

export interface VideoMinimizedEvent extends MeetergoEventEnvelope<{ videoId: string }> {
  event: "videoMinimized";
}

export interface BookerViewedEvent
  extends MeetergoEventEnvelope<{ link: string; slotsLoaded: boolean }> {
  event: "bookerViewed";
}

export interface BookerReopenedEvent extends MeetergoEventEnvelope<{ link: string }> {
  event: "bookerReopened";
}

export interface BookerReloadedEvent extends MeetergoEventEnvelope<{ link: string }> {
  event: "bookerReloaded";
}

export interface RoutedEvent
  extends MeetergoEventEnvelope<{
    actionType: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
    actionValue: string;
  }> {
  event: "routed";
}

/** Union of all strongly-typed events */
export type MeetergoEvent =
  | LinkReadyEvent
  | LinkFailedEvent
  | BookingSuccessfulEvent
  | BookingCancelledEvent
  | BookingRescheduledEvent
  | ModalOpenedEvent
  | ModalClosedEvent
  | SidebarOpenedEvent
  | SidebarClosedEvent
  | VideoPlayEvent
  | VideoPauseEvent
  | VideoExpandedEvent
  | VideoMinimizedEvent
  | BookerViewedEvent
  | BookerReopenedEvent
  | BookerReloadedEvent
  | RoutedEvent;

export type MeetergoEventName = MeetergoEvent["event"];

/** Wildcard event handler receives the full envelope */
export type WildcardHandler = (envelope: MeetergoEventEnvelope) => void;

export type EventHandler<E extends MeetergoEvent = MeetergoEvent> = (event: E) => void;

// ─── Component Configs ────────────────────────────────────────────────────────

export interface FloatingButtonConfig {
  link: string;
  position?: Position;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  icon?: string;
  animation?: ButtonAnimation;
  /** Stable DOM id for the button element */
  domId?: string;
}

/**
 * Configuration for the embeddable WhatsApp click-to-chat widget.
 *
 * Two ways to feed it:
 *   1. Inline — pass `phoneNumber`, `greetingMessage`, `prefilledMessage`,
 *      etc. directly. No network call. Fastest path-to-render. Use this
 *      when the host page has the values at build time.
 *   2. Hosted — pass `companyId` and let the loader fetch the latest
 *      config from `${origin}/integrations/whatsapp/public/widget/:id` on
 *      mount. Lets the meetergo dashboard control the widget without the
 *      customer touching their HTML again.
 *
 * Both can be combined: inline values win, anything missing is filled
 * from the hosted config.
 */
export interface WhatsappButtonConfig {
  /**
   * meetergo company id used to fetch the hosted config. Optional — when
   * omitted, the widget renders purely from the inline fields below.
   */
  companyId?: string;
  /** Phone number in E.164 (with or without leading +). */
  phoneNumber?: string;
  /** Pre-filled WhatsApp draft when the visitor clicks through. */
  prefilledMessage?: string;
  /** Greeting bubble shown inside the popup. */
  greetingMessage?: string;
  /** Display name in the popup header. */
  agentName?: string;
  /** Subtitle / role under the agent name. */
  agentRole?: string;
  /** Avatar URL — falls back to initials when omitted. */
  agentAvatarUrl?: string;
  /** Corner the FAB pins to. Defaults to bottom-right. */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** Primary brand colour (hex). Defaults to WhatsApp green #25D366. */
  primaryColor?: string;
  /** CTA label inside the popup. Defaults to "Start chat". */
  ctaLabel?: string;
  /** Hide the widget for the first N milliseconds after mount. */
  showAfterMs?: number;
  /** When true, the script renders nothing. */
  disabled?: boolean;
  /**
   * GDPR / privacy consent text. When set, a checkbox is shown above
   * the CTA and the CTA stays disabled until the visitor ticks it.
   * Blank / undefined → no checkbox.
   */
  gdprNotice?: string;
  /** Optional URL the consent label links to (privacy policy / imprint). */
  gdprPolicyUrl?: string;
  /**
   * Visitor-side input mode:
   *   - "free-text" (default): pre-filled draft + a single "Start chat"
   *     CTA. The visitor can edit the draft inside WhatsApp before sending.
   *   - "quick-replies": vertical stack of tappable chips, one per
   *     pre-defined intent. No free-text input on the widget. Tapping a
   *     chip opens wa.me with that chip's message.
   */
  inputMode?: "free-text" | "quick-replies";
  /**
   * Pre-defined options shown when `inputMode === "quick-replies"`. Each
   * chip carries its own pre-filled message. Empty list falls back to
   * free-text behaviour.
   */
  quickReplies?: Array<{ label: string; message: string }>;
  /** Stable DOM id for the FAB element. */
  domId?: string;
}

export interface SidebarConfig {
  link: string;
  position?: SidebarPosition;
  width?: string;
  buttonText?: string;
  buttonIcon?: string;
  buttonPosition?: Position;
  backgroundColor?: string;
  textColor?: string;
}

export interface VideoEmbedConfig {
  videoSrc: string;
  posterImage?: string;
  bookingLink: string;
  bookingCta?: string;
  bookingCtaColor?: string;
  videoCta?: string;
  isRound?: boolean;
  buttonColor?: string;
  offset?: string;
  size?: { width?: string; height?: string };
  position?: Position;
}

export interface FormListener {
  link: string;
  formId?: string;
}

export interface InlineEmbedConfig {
  link: string;
  /** Selector or element to embed the iframe inside */
  elementOrSelector: string | HTMLElement;
  alignment?: IframeAlignment;
  prefill?: MeetergoPrefill;
  ui?: UiConfig;
}

// ─── Prerender Config ─────────────────────────────────────────────────────────

export interface PrerenderConfig {
  /** Milliseconds before slot data is considered stale (default: 60000) */
  slotStaleTTL?: number;
  /** Milliseconds before the full iframe is force-reloaded (default: 900000) */
  fullReloadTTL?: number;
}

// ─── Namespace Config ─────────────────────────────────────────────────────────

export interface NamespaceConfig {
  /**
   * Namespace identifier. Multiple namespaces can coexist on one page.
   * Defaults to "default".
   */
  ns?: string;

  /** Base URL for the meetergo booking app */
  origin?: string;

  /** Global prefill for all embeds in this namespace */
  prefill?: MeetergoPrefill;

  /** Forward current page query params to iframes (opt-in) */
  forwardQueryParams?: boolean | string[];

  /** Floating button configuration */
  floatingButton?: FloatingButtonConfig;

  /** WhatsApp click-to-chat widget configuration */
  whatsappButton?: WhatsappButtonConfig;

  /** Sidebar configuration */
  sidebar?: SidebarConfig;

  /** Video embed configuration */
  videoEmbed?: VideoEmbedConfig;

  /** Form listeners */
  formListeners?: FormListener[];

  /** Disable modal globally in this namespace */
  disableModal?: boolean;

  /** Default iframe height (px) */
  iframeHeight?: number;

  /** Enable auto-resize of inline iframes */
  enableAutoResize?: boolean;

  /** Default alignment for inline iframes */
  iframeAlignment?: IframeAlignment;

  /** UI / theme configuration */
  ui?: UiConfig;

  /** Prerender configuration */
  prerender?: PrerenderConfig | false;

  /** Color scheme (synced to all iframes) */
  colorScheme?: ColorScheme;

  /** Enable debug logging to console */
  debug?: boolean;

  /** Draw a green outline around all iframes for visual debugging */
  uiDebug?: boolean;

  /** Custom attributes to apply to every iframe created in this namespace */
  iframeAttrs?: Record<string, string>;

  // ── Callbacks (convenience aliases for on()) ──────────────────────────────

  /** Fires on any booking completion */
  onBookingSuccessful?: (data: BookingSuccessfulData) => void | Promise<void>;

  /** Fires on every event — same as on("*", ...) */
  onEvent?: (event: MeetergoEvent) => void | Promise<void>;

  // ── Legacy v3 compatibility ───────────────────────────────────────────────

  /** @deprecated Use onBookingSuccessful. Kept for v3 migration. */
  onSuccess?: (dataOrId: BookingSuccessfulData | string) => void | Promise<void>;
}

// ─── HLS Types ────────────────────────────────────────────────────────────────

export interface HlsInstance {
  loadSource(url: string): void;
  attachMedia(media: HTMLMediaElement): void;
  on(event: string, callback: (event: string, data: HlsEventData) => void): void;
  destroy(): void;
}

export interface HlsEventData {
  type?: string;
  details?: string;
  fatal?: boolean;
  [key: string]: unknown;
}

// ─── SDK Callable API ─────────────────────────────────────────────────────────

export type SDKMethod =
  | "init"
  | "modal"
  | "inline"
  | "floatingButton"
  | "sidebar"
  | "on"
  | "off"
  | "once"
  | "ui"
  | "prerender"
  | "closeModal"
  | "openModal"
  | "destroy";

export interface SDKCallable {
  (...args: unknown[]): void;
  /** Access named namespaces */
  ns: Record<string, NamespaceHandle>;
  /** Version string */
  version: string;
  /** Internal queue (populated by loader snippet before SDK loads) */
  q?: unknown[][];
  /** Direct method shorthands — meetergo.init(...) as alternative to meetergo("init", ...) */
  init(config?: unknown): void;
  modal(opts?: unknown): void;
  openModal(opts?: unknown): void;
  closeModal(opts?: unknown): void;
  inline(opts?: unknown): void;
  on(opts?: unknown): void;
  off(opts?: unknown): void;
  once(opts?: unknown): void;
  ui(opts?: unknown): void;
  prerender(opts?: unknown): void;
  setPrefill(opts?: unknown): void;
  destroy(opts?: unknown): void;
}

/** Public handle returned for a namespace */
export interface NamespaceHandle {
  openModal(link: string, params?: Record<string, string>): void;
  closeModal(): void;
  isModalOpen(): boolean;
  toggleSidebar(position?: SidebarPosition): void;
  on<E extends MeetergoEvent>(event: E["event"] | "*", handler: EventHandler<E> | WildcardHandler): () => void;
  off<E extends MeetergoEvent>(event: E["event"] | "*", handler: EventHandler<E> | WildcardHandler): void;
  once<E extends MeetergoEvent>(event: E["event"], handler: EventHandler<E>): void;
  ui(config: UiConfig): void;
  setPrefill(data: MeetergoPrefill): void;
  destroy(): void;
}

// ─── Window augmentation ──────────────────────────────────────────────────────

declare global {
  // TypeScript < 4.4 compatibility: AbortSignal in addEventListener options
  interface AddEventListenerOptions {
    signal?: AbortSignal;
  }

  interface Window {
    /** v4 SDK callable */
    meetergo: SDKCallable;
    /** v3 backwards-compat settings object */
    meetergoSettings?: NamespaceConfig;
    Hls?: {
      isSupported(): boolean;
      Events: { MANIFEST_PARSED: string; ERROR: string };
      new (): HlsInstance;
    };
  }
}
