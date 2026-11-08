// Centralized Putty palette (putty-organic.md §2). Single source of truth:
// stylesheet.css text/label colors and scripts/generate-blob-svgs.mjs both
// read from here instead of hardcoding hex values independently. GNOME
// Shell's St CSS has no custom-property/var() support, so "themeable
// later" means editing these constants and regenerating the SVG assets.

export const PUTTY_BASE = '#A878C8';
export const PUTTY_HIGHLIGHT = '#C9A2E1';
export const PUTTY_SHADOW = '#76518F';
export const PUTTY_DEEP_SHADOW = '#563A6B';
export const TEXT_PRIMARY = '#FFFFFF';
export const TEXT_SECONDARY = '#E8D9F0';
export const RUNNING_INDICATOR = '#FFFFFF';
