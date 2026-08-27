# I18n Verification Matrix

Select rows affected by the message change.

| Category | Prove |
| --- | --- |
| Key parity | `en`, `ro`, and `fr` have identical object/leaf paths |
| Translation completeness | New values are meaningful and no generated empty placeholder remains |
| ICU variables | Argument names and types align in every locale |
| ICU branches | Relevant plural/select zero, one, other, and named branches render correctly |
| Rich text | Tag names align and renderers preserve semantics |
| Client selector | Typed selector compiles and renders through the provider |
| Server selector | Async typed selector compiles in the server context |
| Metadata | Localized title/description use the shared helper and live `metadata` shape |
| Email | Subject, preview/body, locale default, and interpolation work without importing the selector runtime |
| Locale request | Missing cookie default and unsupported-locale failure remain correct |
| Generated declaration | Source-derived declaration includes the new path and is not manually edited |
| Rename/removal | No old selector or dictionary path remains |

Run the repository-owned generation first, inspect its changes, then run the
smallest focused test and website compile/check that proves typed consumers.
