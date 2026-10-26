// Row right-click menus (see components/context-menu.tsx). Plain module so server pages can build `data-menu` too.

export type MenuAction =
  /** Go to a page. */
  | { label: string; href: string }
  /** Fire a window event (e.g. open a page's dialog); `detail` is passed along. */
  | { label: string; event: string; detail?: unknown }
  /** POST that needs a written reason first (opens a dialog); `field` is the form field name (default "reason"). */
  | { label: string; reason: string; title: string; field?: string; danger?: boolean };

/** The `data-menu` attribute for a row; falsy entries are dropped so actions can be conditional. */
export const rowMenu = (actions: (MenuAction | false | null | undefined | 0 | '')[]) => ({ 'data-menu': JSON.stringify(actions.filter(Boolean)) });
