# Arabic and English interfaces

Arabic is the default for a new browser session without a saved preference. Use **English** on the login/registration page or application top bar to switch; use **العربية** to switch back. The preference is stored in `localStorage` under `talabak.language`, independently of authentication. Switching language updates existing content without resetting entered form values.

## Scope

- Login and registration, navigation, role dashboards, customer stores/cart/orders, merchant products/categories/orders/store settings, driver deliveries/history, admin management, profile/addresses and notifications.
- Labels, placeholders, buttons, status/role labels, common validation/API errors, loading/error/retry/success/empty states.
- `html.lang` and `html.dir`, Cairo-first Arabic typography, logical CSS positioning/spacing, mirrored directional icons and the mobile drawer.
- Locale-aware dates use `ar-SA-u-ca-gregory` so Arabic presentation keeps the Gregorian calendar. Existing `Intl.NumberFormat` currency displays use the active locale; some compact monetary labels retain decimal digits and the translated currency abbreviation.

Product/store/category names, descriptions, addresses, names and other user-authored database content retain their original language. No migration or automatic translation of stored data is performed. API routes, role/status identifiers, enum values and submitted credentials retain their contracts. Unknown server error messages fall back to the original text; newly introduced API messages need catalog entries.

This work adds no dependency. It does not implement offline storage, a sync queue or a service worker; the [assessment preparation](ASSESSMENT_PREPARATION.md) remains a separate exercise.

## Code entry points

| File | Responsibility |
| --- | --- |
| [I18nContext](../frontend/src/i18n/I18nContext.ts) | Translation, status labels, language loading, context and hook |
| [I18nProvider](../frontend/src/i18n/I18nProvider.tsx) | React state, saved preference, document language/direction/title |
| [messages](../frontend/src/i18n/messages.ts) | English source strings mapped to Arabic |
| [LanguageSwitcher](../frontend/src/components/LanguageSwitcher.tsx) | Accessible language button |
| [StoresPage](../frontend/src/pages/customer/StoresPage.tsx) | Localized REST loading/failure/retry/success and interpolated search results |
| [I18n tests](../frontend/tests/I18n.test.tsx) | Form preservation, persistence, blocked storage, API errors, role filters and safe interpolation |

Inside a component, use `const { t, locale } = useI18n()` and render `t('Source text')`. For dynamic values use a full sentence, such as `t('Item #{number}', { number: index + 1 })`, and include the matching key in the catalog. Render results as React text; do not use `dangerouslySetInnerHTML`. Preserve API enum values in state/payloads and translate only their displayed labels. Use logical CSS properties for spacing and alignment.

## Verification — 31 October 2026

Executed results are also recorded in [QUALITY_GATE](QUALITY_GATE.md). Automated DOM tests mock the API boundary; browser checks below used the actual local API, PostgreSQL and Redis.

- Installed Edge with bundled Playwright: successful login for customer, merchant, driver and admin; 19 authenticated page visits with Arabic/RTL, no observed page JavaScript exceptions or horizontal document overflow at 1440×1000.
- At 390×844: customer dashboard drawer closes off the right edge, opens, and closes after selecting Stores; language changes to English/LTR and survives page reload; no horizontal document overflow observed.
- The browser check exposed untranslated admin order-filter labels; these were corrected and rechecked.
- These are scoped smoke checks, not exhaustive coverage of every modal, workflow, viewport or assistive technology.

Real browser captures: [Arabic login](screenshots/ar-login.png), [merchant products](screenshots/ar-products.png), [mobile dashboard](screenshots/ar-mobile.png). They use local demo data; English product/category names are stored content.

```sh
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```
