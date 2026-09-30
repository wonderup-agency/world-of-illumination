# content-tabs

## Purpose

Generic tabs by attribute: clicking a tab shows its matching panel and hides
the rest. Built for the 9 skin tabs (Tiger … S-Man) in `section_skins` on
the Convertible Decor page, reusable anywhere.

## Webflow Setup

On the wrapper:

```
data-component="content-tabs"
```

Inside it:

| Attribute | Purpose |
| --- | --- |
| `data-content-tabs="menu"` | tab row (becomes `role="tablist"`, scrolls horizontally when it doesn't fit) |
| `data-content-tabs="link"` | each tab |
| `data-content-tabs="pane"` | each panel — paired with tabs **by order** |

The default tab is whichever tab + panel carry the `is-active` combo class in
Webflow (Tiger, the first tab, in `section_skins`). Style the active tab via its `is-active`
combo (e.g. `skins_tab-link.is-active`) and give the panel class
`display: none` with `is-active` → `display: block`, so the Designer shows
the same default state.

## Behavior

- **Init**: Adds tab/tabpanel ARIA roles and ids, activates the default tab.
- **Click / keyboard**: activates the tab. Arrow Left/Right move between tabs
  (wraps), Home/End jump to first/last, Enter/Space activate.
- **Horizontal menu**: when the menu is narrower than its tabs
  (tablet/mobile), the active tab is scrolled to the center of the menu —
  only the menu scrolls, never the page.
- **Resize / Breakpoint**: Not used.

## Dependencies

- `src/styles/content-tabs.css` — hides inactive panes (fallback in case the
  Webflow class doesn't), hides the menu scrollbar, focus outline.

## DOM Expectations

`[data-component='content-tabs']` with as many `link`s as `pane`s. If the
counts differ, the extras are ignored and a warning is logged.

## Notes

- **Why not Webflow's native Tabs widget**: the Webflow MCP can create a
  native Tabs element but not add tabs to it (it comes with 3, and
  TabsLink/TabsPane can't be created via API). Nine tabs would have needed
  manual "Add Tab" clicks in the Designer. This component keeps it editable
  as plain divs and fully scriptable.
- Tabs are `div`s, not `a[href="#"]`, so `global.js`'s anchor-offset click
  handler never touches them.
