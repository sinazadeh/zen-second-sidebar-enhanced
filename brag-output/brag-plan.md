# Brag video plan

## Product truth

- Product: Zen Second Sidebar Enhanced, a privileged userChrome.js script for Zen Browser and Firefox.
- Core promise: "Web panels next to your tabs."
- Demonstrable features: custom web panels, pinned or floating panels, presets, spaces, containers, per-panel user agents, auto-hide and gap controls, shortcuts, and backup.
- Source material: the repository's current settings page and its existing real browser demo. The older demo shows Firefox UI, which remains a supported runtime.

## Creative direction

- Tone: polished app-store launch film.
- Format: landscape, 1920x1080, 30 fps, approximately 18.5 seconds.
- Visual language: charcoal browser chrome, violet accent (#8f82ff), soft glass panels, crisp system typography, rounded cards, sparse glow.
- Motion: purposeful panel slides, short scale-and-fade titles, small interface responses. No decorative motion without narrative purpose.
- Audio: Brag bundled Happy Beats / Business Moves Vol. 12 at restrained volume, with isolated low-risk click and soft-impact accents. No voiceover.

## Storyboard

| Time        | Beat    | Visual                                                                                          | On-screen copy                     | Audio cue                           |
| ----------- | ------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| 0.00-3.40   | Hook    | Real browser footage is visible immediately, framed behind the promise.                         | Web panels beside every tab.       | Music begins; soft impact at 0.56s. |
| 3.40-8.20   | Proof   | The real repository demo fills the frame while product capabilities appear as compact callouts. | Switch panels. Keep browsing.      | Quiet click on the first callout.   |
| 8.20-12.20  | Modes   | Two crops of the real demo show the browser in pinned and floating contexts.                    | Make room—or float above the page. | Major reveal on the 8.20s beat.     |
| 12.20-15.30 | Control | A current Playwright capture of the real settings page scrolls through the frame.               | Make the sidebar yours.            | Soft impact at 12.20s.              |
| 15.30-18.50 | Payoff  | Real browser footage remains behind a compact product promise and GitHub CTA.                   | Web beside every tab.              | Logo payoff at 15.30s; music fades. |

## Brag inspection rubric

1. The product is immediately legible: a second browser sidebar containing web panels.
2. The first three seconds carry the exact repository promise, not a generic productivity claim.
3. Real UI evidence appears by 2.73 seconds and remains the visual center of the proof section.
4. Every named feature is present in README or the current settings implementation.
5. The current settings visual system supplies the palette and component styling.
6. Text remains short enough for phone-sized playback and respects the safe area.
7. Transitions land on useful beats without forcing the narrative pacing.
8. Music and effects support the interface; they do not compete with it.
9. The final frame works as a poster, shows the product in a browser, and includes a GitHub CTA.

## Acceptance criteria

- Hyperframes `check` has no gating errors.
- Review snapshots show readable copy, actual demo footage, and clean scene seams.
- Final MP4 contains mixed music/SFX and plays for approximately 18.5 seconds.
- Poster is selected from a strong rendered frame and baked into frame 0.
- Delivery includes `brag.mp4`, `brag.jpg`, the editable composition, and `share-copy.txt`.
