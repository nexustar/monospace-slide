# Monospace Slide

[中文](README-zh.md)

A slide theme in monospace. Everything sits on a character grid: a Latin letter takes one column, a CJK character two, and headings, tables and code blocks are each a whole number of lines tall.

A deck is a single HTML file with one `section` per slide. `slides.css` sets the type, `slides.js` turns the pages and scales them to the window, and `tools/check.mjs` renders every slide to an image and points out whatever doesn't fit or line up.

The styles are adapted from [The Monospace Web](https://github.com/owickstrom/the-monospace-web) (MIT), and the font is [PlemoCJK](https://github.com/nexustar/PlemoCJK).

## Presenting

Open `index.html` in a browser and you're presenting. It doubles as a guide that walks through every layout; `examples/plemocjk.html` is a complete talk introducing the PlemoCJK font.

Turn pages with the arrow keys, PageUp / PageDown or Space (Shift + Space goes back), jump to either end with Home and End, and press `f` for full screen. The `#3` in the address bar is the slide number, so editing it jumps straight there.

The fonts load from jsDelivr, so presenting needs a network connection. If you can't count on one at the venue, run `npm run pdf` beforehand: the PDF carries its fonts with it.

## Checking

```sh
npm install
npm run check                # check index.html, images go to shots/
npm run check -- deck.html   # check another deck
npm run check -- --dark      # take the images in dark mode
npm run pdf                  # also export index.pdf
```

The check drives the Chromium installed on your machine. If it lives somewhere unusual, point `CHROMIUM_PATH` at it.

## Writing slides

Two numbers to keep in mind: a slide is 96 columns by 18 lines, and once the margins are taken out, the content area is 88 columns by 14 lines. What each element takes up:

| Element | Lines |
| --- | --- |
| `h2`, the slide title | 2, with a blank line after, leaving 11 for the body |
| `p`, `ul`, `ol`, `blockquote` | as many as the text runs to, with a blank line between blocks |
| `pre > code`, a code block | its lines plus 2, each line up to 84 columns |
| `table` | 2 per row, plus 1 for the whole table |
| `h1`, the cover title | 3 per line of text |

Layouts are picked with classes:

- `section.cover`: the cover. Put an `h1`, a subtitle, an `hr` and a `p.meta` in that order; the two `span`s in `p.meta` sit at either end of the line
- `section.chapter`: a chapter slide, with a `p.no` (the chapter number), an `h2` and one sentence
- `div.cols`: two columns of 42; add `three` for three columns of 28, or `aside` for a 56-column main column beside a 28-column sidebar
- `figure > pre`: a text drawing, with an optional `figcaption`. Use `pre.ascii-cjk` when it mixes in CJK characters, so box drawing takes two columns

Give each image a height in whole lines, such as `style="height: calc(var(--line-height) * 8)"`. Leave every other size and gap to the theme; an inline style that changes a height knocks everything after it off the grid.

After each change, run `npm run check` and look through the images in `shots/`. The report has two kinds of result:

- **FAIL**: something runs past the content area or is wider than its box, most often a long line of code. Split the slide in two or cut some content, and keep the type size as it is.
- **warn**: an element's top lands between half lines, which pushes everything after it off the grid.

## Other languages

Write English slides as usual and mark the language with `<html lang="en">`. Latin letters are identical across PlemoCJK's regional versions, and the browser downloads only the Latin slices it needs.

Traditional Chinese, Japanese and Korean write many Han characters differently from Simplified Chinese. Link the font package for the region and the theme picks it by `lang`. Every version has the same widths, so the grid stays the same.

| `lang` | Font package |
| --- | --- |
| `en`, `zh-Hans` and everything else | `https://cdn.jsdelivr.net/npm/plemocjk-sc@0.0.5/PlemoCJK-SC.min.css` |
| `zh-Hant`, `zh-TW`, `zh-HK`, `zh-MO` | `https://cdn.jsdelivr.net/npm/plemocjk-tc@0.0.5/PlemoCJK-TC.min.css` |
| `ja` | `https://cdn.jsdelivr.net/npm/plemocjk-jp@0.0.5/PlemoCJK-JP.min.css` |
| `ko` | `https://cdn.jsdelivr.net/npm/plemocjk-kr@0.0.5/PlemoCJK-KR.min.css` |

Link the SC package first and any other region's after it. For a passage in another language, such as a quotation in Japanese, mark that element with `lang="ja"` and link the Japanese package. With only SC linked, every Han character takes its Simplified Chinese form.
