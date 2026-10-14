# Image credits

Every image in this folder is self-hosted — nothing is hotlinked, so a third
party cannot break the page or throttle the visitor.

All sources are CC0 (public domain dedication) or PDM (Public Domain Mark).
Neither requires attribution. Credits are listed anyway because they are the
right thing to do, and because they tell you exactly where a file came from if
you ever need to replace it.

| File | Subject | Credit | Licence |
|---|---|---|---|
| `fiber-*` | Fibre optic strands | chaitawat, via Wikimedia Commons | CC0 |
| `dedicated-rack-*` | Open server rack | stiefkind, via Openverse/Flickr | CC0 |
| `cables-color-*` | Patch panel cabling | Open Grid Scheduler, via Openverse/Flickr | CC0 |
| `cables-white-*` | Structured cabling close-up | cogdogblog, via Openverse/Flickr | CC0 |
| `code-1-*` | Source code on a dark screen | Lorenzo Cafaro, via StockSnap | CC0 |
| `code-2-*` | Stylesheet on a dark screen | One Idea LLC, via StockSnap | CC0 |
| `developer-*` | Developer at a desk | Anita Peeples, via StockSnap | CC0 |
| `gamer-man-*` | Person holding a controller | kristinn sigurdsson, via Openverse/Flickr | PDM |
| `gamer-woman-*` | Person holding a controller | Matthew Henry, via StockSnap | CC0 |
| `team-*` | People working at laptops | Startup Stock Photos, via StockSnap | CC0 |

## What is deliberately not here

**No Minecraft artwork.** Mojang Studios owns the Minecraft IP. Some Minecraft
screenshots on Wikimedia Commons carry CC or CC BY licences, but Mojang's brand
guidelines restrict using Minecraft assets to promote commercial products, and a
CC licence on a screenshot does not override that. A hosting company putting
Minecraft art on its marketing pages carries real legal risk, so this site uses
generic free-licensed photography instead and leans on its own voxel artwork
(the three.js scene at the site root) for the Minecraft identity.

## Regenerating

Source images were pulled through the Openverse API, filtered to
`license=cc0,pdm`, then converted with ImageMagick:

```bash
convert "$src" -auto-orient -resize "${width}x>" -strip \
        -quality 72 -define webp:method=6 "public/img/$name-$width.webp"
```

Widths are 480, 768 and 960. Only widths at or below each source's native width
are emitted, so the `srcset` widths in the markup are always truthful.