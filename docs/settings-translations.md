# Translating Settings appearance

The Settings appearance section uses English messages bundled with Meadows. It works offline. The proposed Weblate component covers this section only. Hosting and the first target language are pending.

## Proposed Weblate component

| Setting | Value |
| --- | --- |
| Repository | `https://github.com/CLR-Technologies-Inc/withys-public` |
| Branch | `staging` |
| File format | i18next JSON (monolingual) |
| English base file | `app/locales/en/appearance.json` |
| File mask | `app/locales/*/appearance.json` |
| New language file | `app/locales/<language-code>/appearance.json` |

The catalog includes the section heading, setting names, state labels and the theme control's screen-reader hint. Keep keys stable. “System (light)” and “System (dark)” describe the theme currently chosen by the device. SpaceMono is a font family name and stays literal.

Translate only the public interface messages. The upstream maintainer selects the target locale, confirms the translation license and arranges fluent review before enabling a language. When adding an approved catalog, bundle its JSON in the app and pass its messages to `appearanceText`. A missing, empty or whitespace-only translation falls back to the English source. Check the light, dark and system themes, both Simple Mode states, the screen-reader announcements and long labels on a narrow screen.

Weblate’s Libre plan requires approval. A maintainer can review [the hosting terms](https://weblate.org/en/hosting/) and [the supported file format](https://docs.weblate.org/en/latest/formats/i18next.html) before deciding whether to request hosting.
