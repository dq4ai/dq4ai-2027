# dq4ai.github.io

These files are the whole site at <https://dq4ai.github.io/>. They send visitors to the current
edition, <https://dq4ai.github.io/dq4ai-2027/>.

GitHub Pages serves the organization's root address only from a repository named exactly
`dq4ai/dq4ai.github.io`, so these files cannot be deployed from this repository. To set it up (needs
an owner of the `dq4ai` organization):

1. Create a public repository `dq4ai/dq4ai.github.io`.
2. Copy `index.html`, `404.html` and this `README.md` into it and push to `main`.
3. Under Settings → Pages, set the source to **Deploy from a branch**, `main`, `/ (root)`.

Within a few minutes, <https://dq4ai.github.io/> opens the current edition. `404.html` does the same
for any other address under the root that no edition uses.

Each year, change `dq4ai-2027` in both HTML files to the new edition (see `docs/NEW_EDITION.md`).
