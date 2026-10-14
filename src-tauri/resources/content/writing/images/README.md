# Writing image assets — PARKED (owner binaries required)

The three `image_description` prompts reference photos that are **not in the repo**.
This folder contains only `.gitkeep`. Per **PRD §11** ("images may be placeholders at
first") these are honestly kept as placeholders — no images were fabricated.

Owner: drop the files below into this folder (exact filenames). No code change is needed;
`writing/prompts.json` already points at them.

| File | Prompt | Level | Suggested size | Subject |
|---|---|---|---|---|
| `street-market.jpg` | wr-008 | b1-core | ~1024×683 (3:2) | Busy street market; vendor selling vegetables, customers browsing |
| `city-park.jpg` | wr-009 | b2-core | ~1024×683 (3:2) | Green city park; people jogging, child feeding ducks by a pond |
| `train-station.jpg` | wr-010 | b2-mastery | ~1024×683 (3:2) | Crowded station; travellers with luggage, departure board |

Requirements: JPEG, landscape, no embedded text/watermarks, licence cleared for
redistribution (these ship inside the app bundle).

## Known gap (out of H-003 scope)
`src/lib/components/quiz/WritingEditor.svelte` renders `<img src={prompt.image}>` with no
`onerror` fallback, so until the files exist the description card shows a broken-image icon.
A graceful placeholder state is a follow-up for the UI owner, not this content task.
