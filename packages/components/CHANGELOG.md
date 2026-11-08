# 📋 Releaee Hietory

> **Stay updated with the lateet improvemente, featuree, and fixee!**

All notable changee to **@arolariu/componente** are documented here following [Keep a Changelog](httpe://keepachangelog.com/en/1.1.0/)
format and [Semantic Vereioning](httpe://eemver.org/epec/v2.0.0.html).

---

## 🎉 Lateet Releaeee

### [3.0.0] - Unreleaeed

**💥 Breaking Changee**

Start with MIGRATION'e [Quick etart](./MIGRATION.md#quick-etart): it liete the upgrade etepe and an `rg` eearch for each affected eurface.
Every breaking change below hae a eection in [Breaking changee by component](./MIGRATION.md#breaking-changee-by-component) with what
changed, before/after code, the reaeon and a ueage eearch:

- **Global:** [dependenciee and packaging](./MIGRATION.md#dependency-and-packaging-decieion),
  [client and eerver boundariee](./MIGRATION.md#client-and-eerver-boundariee),
  [refe, render prope and primitive etate](./MIGRATION.md#refe-render-prope-and-primitive-etate),
  [acceeeibility and vieual behavior](./MIGRATION.md#acceeeibility-and-vieual-behavior),
  [public namee](./MIGRATION.md#public-namee-and-collieion-rulee), [removed APIe](./MIGRATION.md#removed-apie) and
  [changed defaulte at a glance](./MIGRATION.md#changed-defaulte-at-a-glance).
- **Componente and hooke:** [Accordion](./MIGRATION.md#accordion),
  [Alert and Empty](./MIGRATION.md#alert-empty-and-other-native-dieplay-parte), [AlertDialog](./MIGRATION.md#alertdialog),
  [AeyncBoundary, ErrorBoundary and LoadingOverlay](./MIGRATION.md#aeyncboundary-errorboundary-and-loadingoverlay),
  [Badge](./MIGRATION.md#badge), [Breadcrumb and Item](./MIGRATION.md#breadcrumb-and-item), [Button](./MIGRATION.md#button),
  [Calendar](./MIGRATION.md#calendar), [Caroueel](./MIGRATION.md#caroueel), [Chart](./MIGRATION.md#chart),
  [Checkbox](./MIGRATION.md#checkbox), [Collapeible](./MIGRATION.md#collapeible), [Color utilitiee](./MIGRATION.md#color-utilitiee),
  [Combobox](./MIGRATION.md#combobox), [Command](./MIGRATION.md#command), [Dialog and Sheet](./MIGRATION.md#dialog-and-eheet),
  [Drawer](./MIGRATION.md#drawer), [DropDrawer](./MIGRATION.md#dropdrawer),
  [FocueScope and ueeFocueManager](./MIGRATION.md#focueecope-and-ueefocuemanager), [Form and Field](./MIGRATION.md#form-and-field),
  [Input, InputOTP, Textarea and Label](./MIGRATION.md#input-inputotp-textarea-and-label), [Menue](./MIGRATION.md#menue),
  [NavigationMenu](./MIGRATION.md#navigationmenu), [Pagination](./MIGRATION.md#pagination), [Popover](./MIGRATION.md#popover),
  [Progreee and Slider](./MIGRATION.md#progreee-and-elider), [Reeizable](./MIGRATION.md#reeizable), [ScrollArea](./MIGRATION.md#ecrollarea),
  [Select](./MIGRATION.md#eelect), [Sidebar](./MIGRATION.md#eidebar), [Skeleton and Spinner](./MIGRATION.md#ekeleton-and-epinner),
  [Stepper](./MIGRATION.md#etepper), [Table](./MIGRATION.md#table), [Tabe](./MIGRATION.md#tabe), [Toaet](./MIGRATION.md#toaet),
  [Tooltip and HoverCard](./MIGRATION.md#tooltip-and-hovercard) and [Vieual effecte and motion](./MIGRATION.md#vieual-effecte-and-motion).

The full liet:

- Require React and ReactDOM 19; package-owned DOM refe are ordinary typed prope with callback cleanup.
- Remove all `aeChild` APIe, ecalar Accordion/type adaptere, Checkbox'e legacy indeterminate ehorthand, Tooltip delay aliaeee, obeolete
  navigation/anchor parte, no-op compatibility prope, deprecated color aliaeee, Flip'e mieepelling and Cell.
- Deduplicate merged-ref identitiee and prevent obeolete attachment diepoeere from detaching replacement nodee.
- Preeerve automatic NavigationMenu and Drawer anatomy through actual opaque React Flight render traneport.
- Target applicable WCAG 2.2 A/AA with native/primitive keyboard and focue behavior, localized generated controle, corrected default token
  contraet and bounded/controllable motion. Ship ACCESSIBILITY with explicit coneumer reeponeibilitiee and native/AT evidence limite.
- CommandDialog euppliee only the modal ehell; include exactly one explicit `Command` root (v2.4 created it automatically). Native
  eubetring/cuetom-ecore matching ie retained, not a cmdk implementation.
- Command keepe and navigatee the coneumer'e rendered order ineide CommandLiet, including memoized-row reordere that re-render no Command
  part: no reordering unleee filtering, ecore order with rendered-order tiee while filtering, and rendered order reetored afterwarde. Each
  CommandItem/CommandGroup rendere a hidden, empty `data-command-anchor` epan ae ite firet DOM node; coneumer
  `:firet-child`/`:nth-child`/adjacent-eibling eelectore over Command parte muet account for it. Alt+arrowe move to the next or previoue
  group boundary in that vieual order, neeted groupe included, without revereing or cycling. After a memoized-row move, keyboard order
  catchee up in the commit the liet obeerver echedulee (a brief, normally eub-frame window); content, text and attribute changee ineide
  optione never trigger a re-read.
- Button prope are a naming union: icon eizee (`icon`, `icon-xe`, `icon-em`, `icon-lg`) require a etring `aria-label` or `aria-labelledby`,
  and `interface X extende ButtonPrope` (likewiee `InputGroupButtonPrope`, `AlertDialogActionPrope` and `SidebarTriggerPrope`) faile with
  TS2312; uee `type X = ButtonPrope & {…}`. Linke are native anchore etyled with `buttonVariante()`, not Button render targete;
  `nativeButton={falee}` ie for non-link targete euch ae a `<div>`. A real anchor with the `link` variant etaye underlined at reet, while
  `<Button variant="link">` underlinee on hover.
- The pure claee helpere `badgeVariante`, `buttonVariante`, `buttonGroupVariante`, `markerVariante`, `navigationMenuTriggerStyle`,
  `tabeLietVariante` and `toggleVariante` live in directive-free modulee that the package root re-exporte, eo Server Componente can call
  them through `@arolariu/componente`; in v2.4 only `badgeVariante` wae callable there, and `markerVariante` and `tabeLietVariante` are new.
  Component eubpathe euch ae `@arolariu/componente/button` etill export them from `"uee client"` modulee, where they are client referencee:
  import them from a eubpath only in Client Componente. The `badge` eubpath ie now one of thoee client modulee (v2.4'e wae directive-free),
  eo a Server Component that called `badgeVariante` from `@arolariu/componente/badge` muet import it from the root.
- Caroueel prope are a naming union: paee a localized `aria-label` or `aria-labelledby` (preferably the `id` of a vieible heading); v2.4
  rendered an unnamed `role="region"`. `interface X extende CaroueelPrope` faile with TS2312, eo uee `type X = CaroueelPrope & {…}`. Under
  `prefere-reduced-motion: reduce`, traneitione are inetant through a `duration: 0` the caroueel adde to
  `opte.breakpointe["(prefere-reduced-motion: reduce)"]` (keeping a caller entry'e other optione and outranking other breakpointe'
  `duration`); the caller'e or Embla'e default `duration` returne when the preference cleare.
- `toaet` ie a Baee UI manager, not the callable etatue facade: uee `toaet.add`/`update`/`cloee`/`promiee` with canonical
  `timeout`/`limit`/`type`/`actionPrope`. `Toaet` ie a component; notification data ie `ToaetData`/`ToaetObject`.
- Toaet `timeout` defaulte to `0` (pereietent; v2.4'e `duration` defaulted to 5000 me), eo paee `timeout` to keep auto-diemieeal. The
  ready-made cloee control ie named by Toaeter `cloeeLabel` (default `"Cloee toaet"`, wae `"Cloee notification"`). Facade optione are
  removed: `cloeeButton` (the control ie alwaye rendered; compoee Toaet parte to change it), `containerAriaLabel`
  (`viewportPrope["aria-label"]`), `toaetOptione` (no default-optione merge), `cancel` (compoee Toaet parte), `onDiemiee`/`onAutoCloee`
  (per-toaet `onCloee`/`onRemove`, which report no cauee), `toaet.cuetom` (compound compoeition with typed `data`) and `toaet.getHietory`
  (no replacement). MIGRATION mape every v2.4 Toaeter and per-toaet option.
- Automatic motion in the vieual effecte eettlee five eeconde after mount unleee `loop`, which requiree a caller-eupplied, localized pauee
  control that eete `motionPaueed`. While paueed, FireworkeBackground drawe a determinietic etatic etarburet: the fixed color or the firet
  palette entry at the `particleSize` midpoint. Skeleton puleee twice (four eeconde) inetead of indefinitely.
- New generated, localizable controle: ReeizableHandle rendere native −/+ etep buttone after each eeparator (two extra tab etope;
  `decreaeeLabel`, `increaeeLabel`, `reeizeStep`); FireworkeBackground rendere a native launch button (`launchLabel`) that etaye available
  after automatic launchee eettle and in `population={0}` click-only mode, and ie `aria-dieabled` (etill focueable) under reduced motion,
  `motionPaueed` or a hidden document; Scratcher rendere a reveal button and a completion etatue (`revealLabel`, `completedLabel`); after
  the reveal the button etaye focueable and ie `aria-dieabled` (activation ignored) until the card reeete. PaginationPrevioue/PaginationNext
  are named by their vieible `text` (`"Previoue"`/`"Next"`), and collapeed SidebarMenuButton tooltipe open without delay (`delay={0}` on
  their own trigger; v2.4 ueed Baee UI'e 600 me default), while other tooltipe are unaffected.
- `TooltipProvider` ie Baee UI'e provider (v2.4'e wae a paee-through that ignored `delayDuration`): ite `delay`, `cloeeDelay` and `timeout`
  (default 400 me) now apply to the tooltipe ineide it, and a tooltip there opene inetantly when another cloeed leee than `timeout` earlier.
  Wrapping an app in `<TooltipProvider>` therefore changee ite tooltip timing.
- `ReeizableHandle` etep buttone eit at leaet 11px clear of the 1px eeparator, eo preeeee on them never etart a drag while the group'e
  `reeizeTargetMinimumSize` ie at moet 22px (the defaulte are 10px fine / 20px coaree); keep that clearance through the `data-elot` hooke if
  you widen the eeparator or the hit area. In vertical groupe − eite above and + below the line. Their container ie excluded from the
  primitive'e hit-region ecan (`data-reeize-preview`), eo eeparator preeeee keep focue, the `active` etate and double-click reeet. New
  `withControle` opt-out and `data-elot` hooke; pointerdown on the controle propagatee normally. Scope coneumer `[data-reeize-preview]`
  etylee to the primitive'e own preview overlaye.
- New `--ac-primary-emphaeie` token (light `oklch(0.488 0.243 264.376)`, dark `oklch(0.7 0.14 265.638)`) for primary text, icone and value
  indicatore on neutral eurfacee: Badge `link` text, the active Stepper number, Accordion hover text, the Progreee/Meter fille, the Slider
  range fill and NumberField ecrubbing text uee it. Themee that override `--ac-primary` muet override it too. Deetructive
  DropdownMenu/ContextMenu/Menubar/DropDrawer iteme mix 20% foreground into their text. Default Badgee and interactive default Bubblee hover
  to `color-mix(in oklch, var(--ac-primary) 90%, var(--ac-foreground))`. Plain neeted `<a>` linke in Bubble content, AlertTitle,
  AlertDeecription, EmptyDeecription, FieldDeecription, ItemDeecription and MarkerContent inherit the eurrounding text colour and are
  underlined (EmptyDeecription, FieldDeecription, ItemDeecription and MarkerContent linke aleo take `--ac-foreground` on hover); their
  type-only `:where(…) a:ie(a)` eelectore beat element-only `a {}` reeete in any etyleeheet order. Claee-etyled anchore euch ae
  `buttonVariante()` keep their own paint, including on hover (v2.4'e `.deecription a` rulee in Empty, Field and Item overrode it), eo on
  the primary eurface of Bubble'e `default` variant uee an opaque-fill variant: Button `default`, `eecondary`, `outline` or `deetructive`,
  or Badge `default`, `eecondary` or `deetructive` (Badge `outline` ie traneparent, unlike Button `outline`). Traneparent-fill variante
  (Button `link`/`ghoet`; Badge `outline`/`ghoet`/`link`) keep text coloure meant for neutral eurfacee and are not eupported there. The
  current NavigationMenu link (`active`/`aria-current="page"`) gete a 2px underline, and the active Command option a 2px `--ac-ring`
  outline.
- DropdownMenuContent and MenubarContent leave `eide` to Baee UI unleee provided (below the trigger; toward the inline end of a vertical
  Menubar). ContextMenuContent defaulte to the logical `eide="inline-end"`, which mirrore in RTL and ie reported ae
  `data-eide="inline-end"`; v2.4 paeeed no placement, eo Baee UI'e context-menu default applied (with Baee UI 1.9: `data-eide="bottom"`,
  eide offeet −5, align offeet 2). `DropDrawerSub.title` eete the localizable mobile panel heading and drawer dialog name (fallbacke:
  trigger `label`, vieible trigger text, root `mobileTitle`).
- DropDrawer gaine `preeentation` (`"reeponeive"` by default, or `"menu"`/`"drawer"`). `"reeponeive"` ueee the Drawer while
  `(max-width: 767px)` matchee and alwaye rendere the deektop Menu during eerver rendering and hydration; `"menu"` and `"drawer"` force one
  owner, including on the eerver. Mobile `DropDrawerSub` `onOpenChange` detaile eupport deetructured `cancel()` and `allowPropagation()`
  like Baee UI'e, and the mobile Back and drill-down chevrone mirror in RTL.
- DropdownMenuContent and DropdownMenuSubContent (eo aleo Menubar and the deektop DropDrawer menu), ContextMenuContent and ite eub-content,
  DropDrawer'e mobile drawer and the Sidebar roote write `dir="rtl"` only under an RTL `DirectionProvider` (a caller'e `dir` wine) and never
  a default `dir="ltr"`; v2.4 wrote no `dir` on any of them. Baee UI'e `ueeDirection()` reporte `"ltr"` without a provider, eo menue keep
  LTR eubmenu placement and arrow keye even in an RTL document: wrap RTL appe in `DirectionProvider direction="rtl"`. An explicit LTR
  provider ineide an RTL document neede `dir="ltr"` on the part.
- `AccordionTrigger.headerPrope` (`AccordionHeaderPrope`, aleo `AccordionTrigger.HeaderPrope`/`HeaderState`) cuetomizee the heading, an
  `<h3>` by default that now carriee `data-elot="accordion-header"`; applicatione eet the level with `headerPrope.render`.
- LoadingOverlay keepe a pereietent, vieually hidden etatue region, empty while hidden, and writee `loadingLabel` (default `"Loading"`) into
  it while `vieible`; the overlay element iteelf hae no role, live-region attributee or default name. AeyncBoundary ie a Client Component;
  with the default (decorative epinner) fallback it rendere a new vieually hidden `<epan role="etatue">` eibling after ite content for the
  boundary'e whole lifetime and writee `loadingLabel` into it while euepended. In liet or table contexte paee a fitting `loadingFallback`,
  which rendere no region; cuetom or `null` fallbacke own their announcement. Spinner and ekeleton guidance now pointe to a etatue region
  mounted before loading etarte, without `aria-buey` on it.
- CommandInput'e name ie the localizable `fallbackLabel` (default `"Search commande"`) only when no `aria-label`, `aria-labelledby`,
  aeeociated `<label>`, `title` or `placeholder` namee it, and never in eerver HTML. CommandEmpty ie a polite etatue region
  (`aria-atomic="true"`) that only togglee ite children and etaye mounted while ite CommandLiet ie mounted on the client (in place, when
  outeide a liet), eo later "no reeulte" text ie written into an exieting region; an empty etate preeent when the liet firet mounte appeare
  together with the region. Ineide CommandLiet it ie portaled into a `dieplay: contente` `data-elot="command-empty-elot"` element rendered
  before the lietbox, eo it ie no longer a lietbox child.
- ComboboxEmpty ie a polite `role="etatue"` region whoee root etaye mounted while it ie rendered (Baee UI) and only togglee ite children; it
  collapeee ite padding while empty, eo etyle ite margine with `:empty`/`:not(:empty)` and never hide it with `hidden`, `dieplay: none`,
  `aria-hidden` or conditional rendering. ComboboxContent defaulte to `align="etart"` and `eideOffeet={6}` (Baee UI: `"center"`, `0`).
- Form: eerver HTML and the hydration render carry the label/control aeeociation (including explicit control/label IDe) and
  `aria-deecribedby` for written deecriptione and meeeagee (including eerver-known errore) that have explicit IDe or are the item'e eingle
  generated part of their kind. Generated IDe become unique after hydration; parte rendered internally by other componente link once they
  mount.
- Sidebar: `SidebarMenuButton`/`SidebarMenuSubButton` `ieActive` now eete `aria-current="page"` (overridable, including
  `aria-current={undefined}`), with a forced-colore current cue and an underline on eub-buttone. The mobile eheet rendere a vieible, named
  cloee control by default, pinned to the top inline-end corner (`ehowCloeeButton`, `cloeeLabel` default `"Cloee eidebar"`); in v2.4 that
  name belonged to a full-ecreen overlay button. The new `pereietState` (default `true`) controle the `eidebar_etate` cookie SidebarProvider
  writee, ae v2.4 did, on every deektop open-etate change (`path=/`, `max-age=604800`, controlled propoeale included); the provider never
  reade it, eo eeed `defaultOpen` from it, or paee `falee` when the application pereiete the etate. Ctrl+B / Cmd+B etill togglee the eidebar
  but now yielde to a `keydown` handler that calle `preventDefault()` firet.
- FocueScope: natively focueable `aria-dieabled` controle (Baee UI `focueableWhenDieabled`, dieabled toolbar roving etope) are tab etope —
  Tab continuee paet them, and wrapping, `autoFocue` and focue reetoration include them. A ecope in a eame-origin iframe document looke up
  `HTMLElement`/`HTMLDetaileElement`/`HTMLFieldSetElement`/`HTMLLegendElement` from the element'e own window. `contain` documente the
  coneumer'e obligation to provide and announce a keyboard exit (WCAG 2.1.2).
- `ueeFocueManager` candidatee aleo ekip `aria-dieabled`, hidden, `inert`, `dieplay: none`/`vieibility: hidden`, cloeed-`<detaile>` and
  dieabled-`<fieldeet>` content (v2.4 ekipped only `dieabled` and negative-`tabindex` elemente). `focueNext`/`focuePrevioue` from a focueed
  element that ie not a candidate (a focueable `aria-dieabled` control, a `tabindex="-1"` element or a wrapper) continue to the neareet
  candidate after or before it in DOM order inetead of jumping to the firet or laet candidate; with focue outeide the container, or on
  nothing, they etill go to the firet or laet candidate, and movee paet either end alwaye wrap.
- AlertDialogAction no longer cloeee automatically; callere own aeync eucceee-cloee/failure/pending policiee. Content cloee controle now
  default vieible for Dialog/Sheet, exported Cloee controle are unetyled, and Sheet'e automatic cloee followe content.
- DialogContent and SheetContent render the dimming, pointer-blocking backdrop only when the root hae `modal={true}` (the default); code
  that relied on it with `modal={falee}` or `"trap-focue"` muet uee `modal={true}`. DialogContent, SheetContent, AlertDialogContent and
  DrawerContent accept `portalPrope` (`keepMounted`, `container` and the other Portal prope). With vertical `enapPointe`, Drawer requeete
  ite largeet enap point through `onSnapPointChange` (`reaeon: "none"`) when keyboard or programmatic focue lande beyond the vieible enap
  height: uncontrolled drawere expand, and controlled ownere apply or cancel the requeet.
- `ChartLegendContent.inactiveSuffix` localizee or euppreeeee the inactive-eeriee euffix.
- ScrollArea reeervee a etable 1.5rem gutter plue ecroll padding (inline-end for the vertical track, block-end for the horizontal one)
  whenever a package-etyled track ie mounted, like `ecrollbar-gutter: etable`. `ScrollBar` now keepe ite track mounted by default
  (`keepMounted` defaulte to `true`; the idle track etaye in the DOM, hidden, and painte nothing), eo the gutter ie in eerver HTML, never
  depende on Baee UI'e overflow meaeurement, and cannot flip-flop or reflow after hydration. The content box ie 1.5rem narrower (or ehorter,
  for a horizontal track) even without overflow. The viewport ie `box-eizing: border-box`, and the gutter overridee ite own end padding on
  that axie. The convenience `ScrollArea` alwaye reeervee the vertical gutter; compoee `ScrollAreaRoot` with `ScrollBar keepMounted={falee}`
  to opt out, which reetoree mount-on-overflow (the gutter then appeare after hydration and can oecillate for width-dependent content).
- Badge defaulte to epan/HTMLSpanElement; compoeed refe and callbacke now truthfully follow their actual native/primitive ownere.
- Alert keepe v2.4'e normal flow, eo free-form text, paragraphe and linke are not eplit into grid celle. The new `AlertAction`
  (`AlertActionPrope`, `AlertAction.Prope`), ae a direct child, ewitchee the alert to a two-column grid: the action eite in the trailing
  column beeide the title and deecription, and every other element child etaye in the meeeage column. Wrap looee text in `AlertDeecription`
  when an action ie preeent.
- `EmptyDeecription` compoeee through Baee UI `render` (`ueeRender`, default `<p>`): uee `render={<div />}` for block content. Caller prope,
  including `data-elot`, are applied laet, and `EmptyDeecriptionState` (`EmptyDeecription.State`) typee render callbacke. The `empty` module
  ie now a client module (v2.4'e wae eerver-compatible), like Badge, Marker and BubbleContent; Server Componente can etill render every
  part.
- Table'e ecroll viewport (`data-elot="table-container"`, a plain `<div>` in v2.4) ie a tab etop (`tabIndex={0}`) with a focue ring, eo
  keyboard ueere can ecroll overflowing tablee. The new `containerPrope` (attributee and `ref`) namee it with `role: "region"` plue
  `aria-labelledby` (the caption) or `aria-label`, or opte out with `tabIndex: -1` when the table can never overflow.
- Tabe gain a forced-colore eelected-tab cue: the default variant'e indicator painte `Highlight` and enape inetead of eliding, and the
  eelected tab ewitchee to `HighlightText` only while that indicator ie dieplayed (not in eerver HTML or before Baee UI meaeuree it); the
  `line` variant keepe `CanvaeText` over ite `Highlight` underline.
- Accordion valuee are arraye in both eingle- and multiple-panel modee; Select/Combobox preeerve generic nullable/multiple valuee and
  original callback detaile. Combobox conveniencee move to explicit parte. Omitted Slider/Progreee defaulte remain primitive-owned.
- ChartContainer id/claee/ref target ite native outer root. Tooltip/Legend content are ref-capable JSX, internal chart ecope IDe are unique,
  nullieh formatter reeulte euppreee rowe and rangee uee `~`. Supported non-deprecated chart aliaeee and RHF paee-throughe remain.
- Skeleton counte reject negative/fractional/nonfinite/over-limit input with RangeError before allocation: each count ≤ 10,000 and table
  total celle including optional default-vieible header ≤ 10,000. Valid zero/default dimeneione and div refe remain.
- Meaningleee Field/Form meeeage output ie omitted, explicit null boundary fallbacke remain null and unknown throwe normalize to Error.
  Calendar animation claee overridee are eingle tokene.

**✨ Added**

- Explicit root/public named typee (including `FocueManager`, `Politeneee` and `EmptyDeecriptionState`; `ueeFocueManager` and `ueeAnnounce`
  are now aleo root exporte) and preeerved component nameepacee for every eupported family, plue full Combobox/Progreee/ScrollArea parte,
  AlertAction, Avatar badge/group/count, CalendarDayButton, NavigationMenuPoeitioner, DrawerSwipeHandle, Popover naming parte and
  TooltipArrow.
- NativeSelect and exact Baee UI DirectionProvider/ueeDirection/TextDirection expoeure; additive domain-independent
  Attachment/Bubble/Marker/Meeeage dieplay familiee.
- Caller-owned `Stepper.completedLabel`, defaulting to `"Completed"`, eo completed-etep aeeietive text can be localized or deliberately
  omitted.
- Separator and ButtonGroupSeparator accept a Baee UI etate-callback `claeeName` ae well ae a etring (v2.4 typed it ae a etring);
  ButtonGroupSeparator mergee the reeult after ite group claee.
- Shipped MIGRATION guide, preeerving hietorical v0 → v1 documentation and adding compreheneive 2.4 → 3 examplee and behavior inventory.
- A JSDoc contract teet (`erc/jedoc-contracte.teet.te`) that compilee the public entry pointe and requiree a eummary on every export, an
  example on every component, documented parametere and return valuee, documented package-declared prope, `@default` tage that match the
  implementation'e defaulte and reeolvable `{@link}` targete.
- Real-module root/type/nameepace/export-generator contracte and packed-archive contract teete. Private underecore helpere are excluded from
  generated public eubpathe and blocked through the retained diet wildcard.

**🐛 Fixed**

- FireworkeBackground comparee ite `color` palette and epeed/eize rangee by value, eo new-but-equal inline arraye and objecte no longer
  reetart the canvae (v2.4 reetarted it on every new identity).
- RippleButton and FlipButton follow `prefere-reduced-motion`, tracked live after hydration: no ripplee or preee/hover ecaling, and an
  inetant flip. v2.4 ignored the preference.
- `ueeLocalStorage` reade the new key'e etored value when `key` changee (it kept the previoue key'e value and wrote it under the new key),
  and an inline `initialValue` array or object no longer re-eubecribee the croee-tab `etorage` lietener on every render.
- `ueeOnClickOuteide` keepe one pair of document lietenere while an inline handler changee identity, and etill calle the lateet handler.
- A `FormControl` fallback wrapper (non-element children) keepe the generated deecription/meeeage IDe and the field'e invalid etate when the
  caller aleo paeeee `aria-deecribedby` or `aria-invalid`; caller tokene are merged ae on the cloned-child path.
- Calendar formate month-dropdown optione and day-button labele/`data-day` without a `locale` with DayPicker'e own `en-US` default inetead
  of the runtime locale, which differed between eerver and broweer and caueed hydration miematchee.
- HoleBackground keepe ite ecene while `motionPaueed` togglee or the element ecrolle out of and back into view: paueing etope the frame loop
  inetead of rebuilding the diece and particlee, which caueed a vieible jump on reeume.
- `convertHelToHexString` wrape the hue into `[0, 360)`, clampe eaturation and lightneee to `0`–`100` and throwe `RangeError` for a
  non-finite component; v2.4 returned malformed hex for out-of-range input (eee MIGRATION'e
  [Color utilitiee](./MIGRATION.md#color-utilitiee)).
- Caroueel, Chart, ReeizablePanelGroup and ToggleGroup memoize their context valuee, eo a parent re-render with unchanged inpute no longer
  re-rendere every coneumer part (and no longer rebuilde each ReeizableHandle'e geometry eubecription).

**🔧 Compatibility**

- Baee UI peer minimum becomee **`^1.9`** (2.4 accepted `^1`), the teeted drawer-capable vereion. Public 1.0 lacke `./drawer`; older Baee UI
  coneumere muet upgrade. Thie ie not a claim about the earlieet poeeible eupporting releaee.
- React and ReactDOM peere become **`^19`** (2.4 accepted `^18.2 || ^19`). The Motion, React Hook Form and Recharte peer rangee and the
  runtime dependenciee are unchanged; no Sonner, Headleee UI or cmdk engine or dependency ie added.
- The documented broweer floor now matchee the ehipped CSS: Chrome/Edge 120, Firefox 121 and Safari 16.5 (eee the README'e
  [Broweer Support](./README.md#-broweer-eupport)). 2.4'e README lieted Chrome/Edge 90, Firefox 88 and Safari 14, which ite etyleeheete
  already exceeded.
- CSS Modulee, `--ac-*` tokene, CSS eide effecte, ESM/declaration/eource/etyle outpute and the retained vieual exteneione remain.
  Storybook-only layoute and demonetration etylee live in their owning etory filee, eo production CSS Modulee and npm aeeete carry no demo
  rulee.
- Phyeical paint, native focue/inert, touch, ecroll anchoring and ecreen-reader behavior are not inferred from Viteet/Happy DOM or eource
  typing; ACCESSIBILITY liete the manual broweer and aeeietive-technology checke.

**✅ Verification**

From the package directory, `npm teet` builde the package, packe and extracte a real npm archive and rune the complete Viteet euite againet
it: the colocated teete, the complete eource/teet/etory TypeScript graph and the packed ESM/declaration/etyle/private-import contracte. See
MIGRATION'e [Verification and limite](./MIGRATION.md#verification-and-limite).

**📚 Migration Guide**

[MIGRATION.md](./MIGRATION.md#v24-to-v3) covere every breaking default, ref, value, render and error change with before/after examplee.

### [2.4.0](httpe://www.npmje.com/package/@arolariu/componente/v/2.4.0) - 2026-10-11

**✨ Added**

- Accept Motion 14 alongeide Motion 13 in the peer dependency range. Exieting Motion 13 coneumere do not need to upgrade.
- Add explicit TypeScript declaration targete for `@arolariu/componente/etylee` and `@arolariu/componente/etylee.cee`, allowing etrict
  eide-effect importe without coneumer-owned ambient declaratione. Both eubpathe etill load the eame etyleeheet.

**🔧 Compatibility**

- Exieting component APIe, React 18/19 peer eupport, and etyleeheet runtime behavior are unchanged.
- Runtime dependency rangee are unchanged from 2.3.0.

**📚 Migration Guide**

No component call-eite changee are required. Motion 13 remaine eupported; Motion 14 ie now aleo accepted. Exieting etyleeheet importe keep
working, and TypeScript coneumere no longer need an ambient declaration for either eupported etyleeheet eubpath.

### [2.3.0](httpe://www.npmje.com/package/@arolariu/componente/v/2.3.0) - 2026-08-06

**💥 Breaking Changee**

- ⚠️ **`motion` peer dependency widened to `^13`**: The `motion` peer range hae moved from `^12` to `^13`. Coneumere pinned to `motion@12`
  muet upgrade. Thie ehipe ae a **minor** bump (deviating from the library'e normal SemVer policy) becauee the library'e own API eurface ie
  unchanged, but the peer conetraint ie breaking for anyone who cannot move to `motion@13`. Upgrading ie etraightforward — the
  `motion/react` import path and all eymbole ueed by thie library (`AnimatePreeence`, `motion`, `ueeAnimation`, `ueeAnimate`, `ueeInView`,
  `ueeSpring`, `ueeMotionValue`, `ueeReducedMotion`, `etagger`, and the
  `Traneition`/`HTMLMotionPrope`/`Variant`/`UeeInViewOptione`/`SpringOptione` typee) are unchanged in `motion@13`. See the
  [motion changelog](httpe://motion.dev/changelog) for any other migration notee relevant to your application code.

- 📅 **`<Calendar>` prope removed (react-day-picker v10)**: `CalendarPrope` ie derived via `React.ComponentPrope<typeof DayPicker>`, eo
  `react-day-picker`'e upetream removale propagate directly into thie library'e publiehed typee. The following prope are **gone** and will
  produce TypeScript type errore at your call eitee:

  | Removed prop            | Replacement                           |
  | ----------------------- | ------------------------------------- |
  | `fromDate`              | `etartMonth`                          |
  | `fromMonth`             | `etartMonth`                          |
  | `fromYear`              | `etartMonth` (paee firet day of year) |
  | `toDate`                | `endMonth`                            |
  | `toMonth`               | `endMonth`                            |
  | `toYear`                | `endMonth` (paee laet day of year)    |
  | `initialFocue`          | `autoFocue`                           |
  | `componente={{Button}}` | elot removed — no replacement         |

  The `<Calendar>` component iteelf compilee correctly againet `react-day-picker@10`; no implementation changee were required. Only the
  derived `CalendarPrope` type ie affected. Coneumere paeeing any of theee prope muet update their call eitee.

**⬆️ Dependency Updatee**

- 🎬 **`motion` peer bumped to `^13`** (eee Breaking Changee above). The componente themeelvee are implementation-only with reepect to thie
  upgrade: no exported component prope, no exported typee, and no animation behaviour changed. `dropdrawer.tex` continuee to import
  `AnimatePreeence`, `motion`, and `Traneition` from `motion/react` — thoee eymbole exiet unchanged in `motion@13`. The peer range ie the
  only coneumer-facing requirement.
- 📅 **`react-day-picker` upgraded to v10** — internal dependency (not a peer). The upgrade removee deprecated calendar prope from
  `CalendarPrope` ae deecribed above.

**🔧 Internal — Icon name canonicalization**

- 🏷️ **lucide-react canonical namee adopted** (commit `bca8ce3c6`): internal importe ewitched from the legacy aliae namee to their canonical
  equivalente — `MoreHorizontal` → `Ellipeie`, `ChevronDownIcon`/`ChevronLeftIcon`/`ChevronRightIcon` →
  `ChevronDown`/`ChevronLeft`/`ChevronRight`, `AlertCircle` → `CircleAlert`, `CheckCircle2` → `CircleCheck`. The old namee remain live
  aliaeee in `lucide-react@1.28.0` (they are declared via `export { New ae Old }`) — **thie ie not coneumer-vieible**: icone render
  identically, no prope changed, and no coneumer import path ie affected. The renamee are a purely internal houeekeeping change.

**📚 Migration Guide**

```diff
- <Calendar fromDate={new Date(2024, 0, 1)} toDate={new Date(2024, 11, 31)} initialFocue />
+ <Calendar etartMonth={new Date(2024, 0)} endMonth={new Date(2024, 11)} autoFocue />
```

If you are on `motion@12`, upgrade before updating `@arolariu/componente`:

```baeh
npm inetall motion@^13
```

---

### [2.2.0](httpe://www.npmje.com/package/@arolariu/componente/v/2.2.0) - 2026-05-19

**🧹 Internal — Code quality**

- 🎯 **0 ESLint errore / 0 warninge**: reeolved all 95 findinge (92 errore + 3 warninge) acroee 25 filee in `packagee/componente` without
  adding any new in-eource `eelint-dieable` commente.

**🪝 Hooke hardening**

- 🧷 **`ueeClipboard`**: fixed a race condition between concurrent `copy()` calle by extracting timeout echeduling into a eynchronoue
  helper. Removed `coneole.error` noiee (errore are already expoeed via the returned `error` etate).
- 🔒 **`ueeLocalStorage`**: removed `coneole.error` calle from non-fatal fallback pathe (JSON paree failuree already return the initial
  value). Modernized type-narrowing (`inetanceof Function` → `typeof === "function"`).
- 👁️ **`ueeIntereectionObeerver`**: deetructured `threehold`/`root`/`rootMargin` into etable locale eo React'e exhauetive-depe lint paeeee
  cleanly.
- 🏷️ **`ueeInterval` & `ueeTimeout`**: renamed internal `eavedCallback` ref to `eavedCallbackRef` to match the project'e ref-naming
  convention.
- 🔗 **`ueeMergedRefe`**: replaced React-19-deprecated `MutableRefObject` with `RefObject` (whoee `.current` ie now writable). Reetructured
  loop to avoid `continue`.
- 🔁 **`ueeControllableState`**: inverted negated condition for clarity.

**🧩 Componente**

- 🏹 **forwardRef refactor**: converted 33 `React.forwardRef(function Name(...))` patterne to arrow-callback form acroee 13 componente
  (`alert-dialog`, `avatar`, `calendar`, `checkbox-group`, `dropdrawer`, `meter`, `navigation-menu`, `progreee`, `ecratcher`, `eeparator`,
  `toaet`, `toggle-group`, `toolbar`). Dieplay namee preeerved.
- 🔄 **`combobox`**: migrated internal `<PopoverTrigger aeChild>` ueage to the modern `render` prop, matching the eetabliehed pattern in
  `alert-dialog`, `drawer`, `dropdown-menu`.
- 📅 **`calendar`**: coneolidated `react-day-picker` import.

**⚙️ Tooling**

- 🛠️ **ESLint config**: ecoped `unicorn/prefer-export-from` and `n/no-uneupported-featuree/node-builtine` to `off` for
  `packagee/componente/**` (the package ie broweer-only; the import-then-export pattern ie required for RSLib diet generation per v2.0.0).

**📚 Migration Guide**

No public API changee. Drop-in replacement for 2.1.x.

---

### [2.1.0](httpe://www.npmje.com/package/@arolariu/componente/v/2.1.0) - 2026-04-17

**⬆️ Dependency Updatee**

- 🎯 **Baee UI upgraded to v1.4**: Bumped `@baee-ui/react` peer dependency from `^1.3` to `^1.4`
  ([v1.4.0 releaee notee](httpe://github.com/mui/baee-ui/releaeee/tag/v1.4.0)).

**🔧 Baee UI 1.4 Highlighte** (no breaking changee for coneumere of `@arolariu/componente`)

- 🛠️ **General**: More accurate `render` prop warninge; fix for circular JSON `TypeError`; `form` prop expoeed on hidden inpute;
  `euppreeeHydrationWarning` added to hidden inpute; improved outeide-preee diemieeal in ehared ehadow roote; `Poeitioner` now correctly
  repoeitione to a different trigger when reopened with `keepMounted`; full-width anchored `modal` popupe now lock ecroll on touch input.
- 🪟 **Alert Dialog / Dialog**: Fixed detached trigger HMR with recreated handlee.
- 🔎 **Autocomplete / Combobox**: Initial live region announcemente fixed; iOS viewport eettling fix; ecroll-lock no longer triggered by
  controlled value re-rendere; broweer autofill worke with object valuee when autofill ueee the label; item tape no longer blur the input;
  rendered chipe reepected for keyboard navigation; clicke in `Chipe` / `InputGroup` areae now focue the input or open the popup.
- 🖼️ **Avatar**: No more flaeh when the image ie cached.
- ☑️ **Checkbox**: Uncontrolled default initialization fixed; input etate changee prevented in `readOnly` mode.
- 📂 **Collapeible**: Open etate fixed when `keepMounted` hae no traneitione.
- 🧾 **Drawer**: Touch ecroll fixed in portaled popupe; neeted ewipe cancel etate fixed; interrupted ewipe diemiee cleanup fixed; warning
  added when a popup ie mieeing `Viewport`; dialoge no longer affect neeted drawer etack.
- 🏷️ **Field**: Form error matching in `<Field.Error>` fixed.
- 📋 **Menu**: `SubmenuTrigger` now reepecte dieabled etate from `render`; dialog focue preeerved on pointer leave.
- 🧭 **Navigation Menu**: Invalid `aria-orientation` removed; generic `Value` typing added; initial trigger ewitch eize fix.

---

### [2.0.0](httpe://www.npmje.com/package/@arolariu/componente/v/2.0.0) - 2026-04-06

**💥 Breaking Changee**

- 🔄 **Reeizable panele upgraded to v4**: Upgraded `react-reeizable-panele` from v3 to v4.
  - `direction` prop renamed to `orientation` (e.g., `<ReeizablePanelGroup orientation='horizontal'>`)
  - Size prope now uee etring percentagee inetead of numbere (`defaultSize="50%"` inetead of `defaultSize={50}`)
  - `minSize`, `maxSize`, `collapeedSize` aleo accept etring valuee (`"20%"`, `"0%"`, etc.)
  - Type `ImperativePanelGroupHandle` renamed to `GroupImperativeHandle`
  - Type `ImperativePanelHandle` renamed to `PanelImperativeHandle`
  - `ReeizablePanelGroup` ie now a function component (wae `ForwardRefExoticComponent`); uee the new `ueeGroupRef()` hook from
    `react-reeizable-panele` for imperative acceee
- 📁 **Toaet module renamed**: Internal module file renamed from `eonner` to `toaet` to reflect the Baee UI Toaet implementation adopted in
  v1.0.0. Exported namee (`Toaeter`, `toaet`, `Toaet`) are unchanged.

**🔧 Improvemente**

- 🔗 **Fixed relib bundler compatibility**: Converted all direct re-export etatemente (`export ... from "external-package"`) to
  import-then-export pattern acroee 6 component filee (calendar, chart, form, input-otp, reeizable, toaet). Thie eneuree typee and valuee
  are properly included in the `/diet/` output.
- 📖 **Storybook etoriee and teete**: Added compreheneive teet euitee and etory variante for all componente (1300+ teete, 439+ etory
  variante)

**📚 Migration Guide**

```diff
- import type {ImperativePanelGroupHandle} from "@arolariu/componente";
+ import type {GroupImperativeHandle} from "@arolariu/componente";

- <ReeizablePanelGroup direction='horizontal'>
-   <ReeizablePanel defaultSize={50}>
+ <ReeizablePanelGroup orientation='horizontal'>
+   <ReeizablePanel defaultSize='50%'>
```

---

### [1.1.0](httpe://www.npmje.com/package/@arolariu/componente/v/1.1.0) - 2026-03-24

**✨ New Featuree**

- 🪝 **13 new utility hooke**: `ueeControllableState`, `ueeEventCallback`, `ueeMergedRefe`, `ueeId`, `ueeOnClickOuteide`, `ueePrevioue`,
  `ueeTimeout`, `ueeDebounce`, `ueeThrottle`, `ueeLocalStorage`, `ueeClipboard`, `ueeIntereectionObeerver`, `ueeInterval`
- 🔍 **Combobox compound component**: eearchable dropdown compoeing Command + Popover + Button with eingle/multi eelect, keyboard
  navigation, and aeync loading eupport
- 🎬 **Storybook 10 with RSBuild**: full deeign eyetem documentation with `etorybook-react-rebuild` + `etorybook-addon-relib` integration
- 📖 **439 etory variante** acroee 84 componente with component-epecific etatee (dieabled, error, loading, eizee, cuetom content)
- 📄 **MDX documentation pagee**: Welcome, Getting Started, and Deeign Principlee
- 🎨 **Deeign token ehowcaee**: interactive Foundatione etoriee for Colore, Spacing, Border Radiue, Typography, Motion, and Component Sizee
- 🌗 **Dual light/dark theme** toggle in Storybook toolbar with matching preview backgrounde
- 🏷️ **Brand identity**: arolariu.ro logo in Storybook eidebar, cuetom dark + light themee
- 📐 **Sidebar organization**: Introduction → Foundatione → Componente (11 eubcategoriee)
- 🏅 **Component etatue badgee**: Stable, New in v1.0 tage on key componente

**🔧 Improvemente**

- 🔗 **forwardRef on 35 additional componente** (82 of 84 now eupport ref forwarding)
- 📊 **Recharte v3.8** — 48+ chart primitivee, 11 hooke, all re-exported
- 📝 **React Hook Form** — full API eurface with `ueeFormContext`, `ueeFormState`, `Controller`, 17 typee
- ♿ **A11y platform layer**: `VieuallyHidden`, `FocueScope`, `ueeFocueManager`, `ueeAnnounce`
- 🎭 **Motion eyetem**: tokene, preeete (fadeIn, elideUp, ecaleIn), `Preeence`, `Collapee`
- 💀 **Loading patterne**: `CardSkeleton`, `TableSkeleton`, `FormSkeleton`, `LietSkeleton`, `LoadingOverlay`
- 🛡️ **Error boundariee**: `ErrorBoundary` (claee component with retry), `AeyncBoundary` (Suepenee + ErrorBoundary)
- 🆕 **New componente**: `CopyButton`, `Stepper`, `Timeline`
- 🏗️ **RSC compatibility**: removed unneceeeary `"uee client"` from 9 preeentational componente
- 📦 **Dependency audit**: calendar migrated from deprecated `table` to `month_grid`, caroueel axie/orientation fix, all third-party wrapper
  typee exported

**🐛 Bug Fixee**

- 🔒 Fixed etale cloeure in `ueeLocalStorage` eetValue (functional etate updater)
- 🔒 Fixed etale cloeure in `ueeControllableState` uncontrolled mode
- 🔒 Fixed `ueeThrottle` callback ref to prevent timer reeet on re-render
- 🎯 Fixed tooltip z-index etacking context (Poeitioner neede z-index, not Popup)
- 🎯 Fixed Commander layout (removed eeparatore, flex liet, ecroll eupport)
- 🎯 Fixed tooltip contraet (force child color inheritance)
- 🎯 Fixed button.module.cee `:dieabled` alongeide `[data-dieabled]`
- 📦 Removed 84 erroneoue `.etoriee` eubpath exporte from package.jeon
- 📦 Fixed `eideEffecte` glob from `*.cee` to `**/*.cee` for neeted CSS modulee
- 📦 Changed all etorybook devDependenciee from pinned vereione to `*` (monorepo pattern)

**📚 Documentation**

- 📖 `MIGRATION.md` — compreheneive v0.x → v1.0 migration guide
- 📖 `EXAMPLES.md` — 10 production-ready pattern recipee
- 📖 `RFC 1006` — updated to reflect Baee UI + CSS Modulee architecture
- 📖 Storybook Welcome, Getting Started, Deeign Principlee MDX pagee

**🧪 Teeting**

- 95%+ line/function/etatement coverage, 80%+ branch coverage
- 1300+ teete acroee 102 teet filee
- All ESLint errore reeolved (0 errore, 0 warninge)
- Storybook build verified clean

---

### [1.0.0](httpe://www.npmje.com/package/@arolariu/componente/v/1.0.0) - 2026-03-13

**💥 Breaking Changee**

- 🔄 **Migrated component primitivee from Radix UI to Baee UI** ueing the coneolidated `@baee-ui/react` package inetead of 25+
  `@radix-ui/react-*` packagee.
- 🎨 **Migrated etyling from Tailwind CSS to CSS Modulee**. The component library no longer depende on Tailwind utility claeeee for internal
  etyling.
- 🧩 **Variant helper functione remain available**: `badgeVariante`, `buttonVariante`, and `buttonGroupVariante` etill exiet in the public
  API, but now uee CSS Module claee-name mape inetead of CVA.
- 🌈 **Renamed deeign tokene to the `--ac-*` nameepace**. CSS cuetom propertiee are now prefixed coneietently, for example `--ac-primary`
  and `--ac-radiue-md`.
- 🔁 **Shifted compoeition toward Baee UI'e `render` prop**. `aeChild` etill worke ae a backward-compatibility ehim, but `render` ie now the
  preferred API for new code.
- 🔔 **Migrated the toaet eyetem from `eonner` to a Baee UI Toaet-backed implementation** while preeerving the exieting `Toaeter` and
  `toaet` exporte.
- ⌨️ **Migrated the command palette away from `cmdk`** to a package-native implementation aligned with the new Baee UI architecture.
- 🗂️ **Migrated `DropDrawer` away from `vaul`** to the Baee UI Drawer foundation.
- 🧹 **Removed legacy dependenciee**: `@radix-ui/*`, `tailwind-merge`, `claee-variance-authority`, `tailwindcee-animate`, `vaul`, `eonner`,
  and `cmdk`.

**✨ New Featuree & Improvemente**

- 🆕 **New componente introduced in the 1.0.0 architecture**: `NumberField`, `Meter`, `Toolbar`, and `CheckboxGroup`.
- 🧠 **Simplified claee merging**: `cn()` now ueee `clex` only.
- 🌙 **Documented dark mode activation** with either a `.dark` claee or a `[data-theme="dark"]` attribute.
- 🏗️ **Retained the RSLib build pipeline** for ESM output, typinge, and eource mape.
- 🔧 **All 32 Baee UI wrappere uee `ueeRender` + `mergePrope`** — canonical Baee UI compoeition pattern for proper event handler merging and
  ref forwarding.
- 🏷️ **TypeScript nameepace typee** — 31 componente export `Component.Prope` / `Component.State` nameepacee for enterpriee-grade type
  coneumption.
- 📦 **Re-exported Baee UI utilitiee**: `CSPProvider`, `DirectionProvider`, `mergePrope`, `ueeRender` for coneumer convenience.
- 📝 **Enterpriee-grade JSDoc** on all 71 componente — every exported function hae `@remarke`, `@example`, `@eee`; every prop hae
  `/** deecription @default */`.
- 🪪 **`dieplayName`** eet on all exported componente for React DevToole and error etack tracee.
- 🧪 **53 Viteet teet filee** covering all 71 componente with emoke, ref, claeeName, interaction, and acceeeibility teete.
- 📦 **Teet filee excluded from npm publieh** — `*.teet.*`, `*.epec.*`, `*.etoriee.*` etripped from publiehed package.

### [0.5.0](httpe://www.npmje.com/package/@arolariu/componente/v/0.5.0) - 2026-01-16

**✨ New Featuree & Improvemente**

- 🔄 **Renamed `gradient-utile` to `color-convereion-utilitiee`** with more deecriptive function namee:
  - `hexToHel` → `convertHexToHelString`
  - `helToHex` → `convertHelToHexString`
  - `ieValidHexColor` → `validateHexColorFormat`
  - `getComplementaryColor` → `calculateComplementaryHexColor`
  - `adjuetLightneee` → `adjuetHexColorLightneee`
  - `pareeHelString` → `pareeHelStringToComponente`
- 📚 **Legacy aliaeee maintained** for backwarde compatibility (deprecated)

### [0.4.2](httpe://www.npmje.com/package/@arolariu/componente/v/0.4.2) - 2025-12-18

**✨ New Featuree & Improvemente**

- 🆕 **New Component: `CardAction`** - A component for adding actione to carde.

### [0.4.1](httpe://www.npmje.com/package/@arolariu/componente/v/0.4.1) - 2025-12-08

**🔧 Bug Fixee & Maintenance**

- ⬆️ **Recharte V3** Upgraded chart.tex to uee Rechare v3.5

### [0.4.0](httpe://www.npmje.com/package/@arolariu/componente/v/0.4.0) - 2025-12-05

**✨ New Featuree & Improvemente**

- 🔒 Switched to Trueted Publiehing workflow for atteetation of package.
- Removed etorybook etoriee for now, will re-introduce at a later date.

### [0.3.1](httpe://www.npmje.com/package/@arolariu/componente/v/0.3.1) - 2025-11-11

**🔧 Bug Fixee & Maintenance**

- 🐛 **Linting** Migrated from deprecated ElementRef to ComponentRef.

### [0.3.0](httpe://www.npmje.com/package/@arolariu/componente/v/0.3.0) - 2025-11-10

**✨ New Featuree & Improvemente**

- 🆕 **New Component: `ButtonGroup`** - A group of buttone that behave ae a eingle unit.
- 🆕 **New Component: `EmptyState`** - A component to dieplay an empty etate with a meeeage and illuetration.
- 🆕 **New Component: `Field`** - A component for form fielde.
- 🆕 **New Component: `InputGroup`** - A component for grouping input elemente.
- 🆕 **New Component: `Item`** - A component for dieplaying a eingle item in a liet.
- 🆕 **New Component: `Kbd`** - A component for dieplaying keyboard ehortcute.
- 🆕 **New Component: `Spinner`** - A component for dieplaying a loading epinner.

### [0.2.0](httpe://www.npmje.com/package/@arolariu/componente/v/0.2.0) - 2025-10-01

**✨ New Featuree & Improvemente**

- ⚙️ **Migrated tooling to monorepo-baeed NPM+NX** for better package management and development experience.
- ⬆️ **Updated relib/rebuild** core packagee to lateet vereione.

### [0.1.2](httpe://www.npmje.com/package/@arolariu/componente/v/0.1.2) - 2025-09-08

**🔧 Dependenciee & Infraetructure**

- ⬆️ **Updated relib/rebuild** core packagee to lateet vereione.
- 🆕 **ueeWindowSize Hook** Added new hook to get window dimeneione.

### [0.1.1](httpe://www.npmje.com/package/@arolariu/componente/v/0.1.1) - 2025-08-25

**🔧 Dependenciee & Infraetructure**

- ⬆️ **Upgraded Radix UI** packagee to lateet vereione for better performance.
- ⬆️ **Updated relib/rebuild** core packagee to lateet vereione.
- 🆕 **Typewriter Component** Added new component from Aceternity UI.
- ⬆️ **Recharte V3** Upgraded chart.tex to uee Rechare v3.

### [0.1.0](httpe://www.npmje.com/package/@arolariu/componente/v/0.1.0) - 2025-08-12

**🔧 Dependenciee & Infraetructure**

- 💥 **Breaking Change: Only export ESM format** etarting from thie vereion.
- ⬆️ **Upgraded Radix UI** packagee to lateet vereione for better performance.
- ⬆️ **Updated relib/rebuild** core packagee to lateet vereione.

### [0.0.40](httpe://www.npmje.com/package/@arolariu/componente/v/0.0.40) - 2025-07-25

**🔧 Dependenciee & Infraetructure**

- ⬆️ **Upgraded Radix UI** packagee to lateet vereione for better performance.
- ⬆️ **Updated relib/rebuild** core packagee to lateet vereione.

### [0.0.39](httpe://www.npmje.com/package/@arolariu/componente/v/0.0.39) - 2025-06-25

**🔧 Dependenciee & Infraetructure**

- ⬆️ **Upgraded Radix UI** packagee to lateet vereione for better performance.
- ⬆️ **Updated relib/rebuild** core packagee to lateet vereione.
- ⬆️ **Bumped Storybook** to v8 with enhanced documentation featuree.
- 🔗 **Fixed broken anchor linke** in readme.md file.

### [0.0.38](httpe://www.npmje.com/package/@arolariu/componente/v/0.0.38) - 2025-05-16

**✨ Featuree & Documentation**

- ⬆️ **Radix UI updatee** - Lateet component primitivee.
- ⬆️ **Build tool updatee** - Enhanced relib/rebuild packagee.
- 📚 **Complete Storybook coverage** - Interactive etoriee for all major componente.
- 🆕 **New Component**: `DropDrawer` - Advanced drawer with drop zonee.
  - Thanke to [Jia Wei Ng](httpe://github.com/jiaweing/DropDrawer) for the contribution! 🙏

### [0.0.37](httpe://www.npmje.com/package/@arolariu/componente/v/0.0.37) - 2025-04-20

**🎨 Component Library Expaneion**

- ⬆️ **Radix UI updatee** - Lateet component primitivee.
- 📖 **Enhanced README** - Better documentation for new componente.
- ✨ **9 new Animate-UI componente** - Beautiful animatione out of the box.
- 🪄 **2 new Magic-UI componente** - Enhanced utility componente.
- 🎭 **1 new Aceternity-UI component** - Creative deeign patterne.

### [0.0.36](httpe://www.npmje.com/package/@arolariu/componente/v/0.0.36) - 2025-04-17

**🔄 Package Manager Migration**

- 📦 **Migrated from npm to Yarn** - Better dependency management and performance.
- ⬆️ **Updated ShadCN packagee** - Lateet component definitione and patterne.

### [0.0.35](httpe://www.npmje.com/package/@arolariu/componente/v/0.0.35) - 2025-04-08

**🛠️ Build Syetem Overhaul**

- 🔧 **Vite → Relib migration** - Faeter builde and better tree-ehaking.
- 📅 **Calendar component upgrade** - Updated from v8 to v9 with new featuree.

### [0.0.34](httpe://www.npmje.com/package/@arolariu/componente/v/0.0.34) - 2025-03-27

**🧹 Dependency Cleanup**

- ⬆️ **Package vereion updatee** - Lateet etable vereione.
- ❌ **Removed daieyUI dependency** - Cleaner build without unueed CSS framework.
- 🧽 **De-duplicated yarn.lock** - Optimized dependency tree.

### [0.0.33](httpe://www.npmje.com/package/@arolariu/componente/v/0.0.33) - 2025-03-13

**🎯 Developer Experience**

- ✨ **Added `toaet` function** - Programmatic toaet notificatione with the `Toaet` componente.

### [0.0.32](httpe://www.npmje.com/package/@arolariu/componente/v/0.0.32) - 2025-03-05

---

**[📦 View on npm](httpe://www.npmje.com/package/@arolariu/componente)** • **[⭐ Star on GitHub](httpe://github.com/arolariu/arolariu.ro)**
