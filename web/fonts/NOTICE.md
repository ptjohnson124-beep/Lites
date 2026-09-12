# Bundled typefaces

Seven latin-subset WOFF2 files, taken from Google Fonts and inlined into the
tracker by `tools/inject_hud_skin.py`. All seven are licensed under the
**SIL Open Font License 1.1**, which permits redistribution and embedding.
The licence requires that this notice travel with the files.

| File | Family | Designer(s) |
|---|---|---|
| `SpaceMono-400.woff2`, `SpaceMono-700.woff2` | Space Mono | Colophon Foundry |
| `ChakraPetch-600.woff2` | Chakra Petch | Cadson Demak |
| `Cinzel-700.woff2` | Cinzel | Natanael Gama |
| `Orbitron-800.woff2` | Orbitron | Matt McInerney |
| `Audiowide-400.woff2` | Audiowide | Brian J. Bonislawsky (Astigmatic) |
| `Syncopate-700.woff2` | Syncopate | Font Diner |

Full licence text: https://openfontlicense.org/open-font-license-official-text/

The first three were already named in the tracker's own stylesheet
(`--mono`, `--hud`, `--sacred`) with no `@font-face` behind them; bundling
them is what makes those declarations resolve. The last four are additions.
