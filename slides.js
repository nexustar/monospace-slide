// Show the deck one slide at a time, scaled to fit the window (see "slides" in slides.css).

const root = document.documentElement;
const slides = [...document.querySelectorAll("body > section")];
// how far the slides are scaled; lengths read from the page are divided by it
let scale = 1;
let current = 0;

function lineHeight() {
  const probe = document.createElement("div");
  probe.style.cssText = "position: fixed; height: var(--line-height)";
  document.body.append(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height;
}

// Pad each figure, and each image or video outside one, to a whole number of lines, so what
// follows stays on the grid.
function padToLines() {
  const line = lineHeight();
  for (const element of document.querySelectorAll("figure, :not(figure) > :is(img, video)")) {
    element.style.paddingBottom = "";
    const rest = (element.getBoundingClientRect().height / scale) % line;
    // tolerate subpixel noise
    if (rest > 0.01 && line - rest > 0.01) {
      element.style.paddingBottom = `${line - rest}px`;
    }
  }
}

// As large as fits, centred. The offsets are whole pixels, so at a scale of 1 text stays sharp.
function fit() {
  const style = getComputedStyle(slides[0]);
  const width = parseFloat(style.width);
  const height = parseFloat(style.height);
  scale = Math.min(window.innerWidth / width, window.innerHeight / height);
  root.style.setProperty("--deck-scale", scale);
  root.style.setProperty("--deck-x", `${Math.round((window.innerWidth - width * scale) / 2)}px`);
  root.style.setProperty("--deck-y", `${Math.round((window.innerHeight - height * scale) / 2)}px`);
}

// slides count from 1 in the footer and in the URL (#3)
function show(index) {
  current = Math.max(0, Math.min(slides.length - 1, index));
  slides.forEach((slide, i) => slide.classList.toggle("current", i === current));
  if (location.hash !== `#${current + 1}`) {
    history.replaceState(null, "", `#${current + 1}`);
  }
}

function showFromHash() {
  show((parseInt(location.hash.slice(1), 10) || 1) - 1);
}

if (slides.length) {
  const digits = String(slides.length).length;
  slides.forEach((slide, i) => {
    slide.dataset.deck = document.title;
    slide.dataset.no = `${String(i + 1).padStart(digits, "0")} / ${slides.length}`;
  });

  root.classList.add("deck");
  fit();
  padToLines();
  showFromHash();

  window.addEventListener("resize", fit);
  window.addEventListener("hashchange", showFromHash);
  // sizes change as images and video metadata load (load events don't bubble, so listen while
  // they travel down) and as fonts arrive; a column's width is the font's
  document.addEventListener("load", padToLines, true);
  document.addEventListener("loadedmetadata", padToLines, true);
  document.fonts.ready.then(() => {
    fit();
    padToLines();
  });

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // a focused checkbox, link or summary keeps its own keys
    const free = event.target === document.body;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
        show(current + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        show(current - 1);
        break;
      case " ":
        if (!free) return;
        show(current + (event.shiftKey ? -1 : 1));
        break;
      case "Home":
        show(0);
        break;
      case "End":
        show(slides.length - 1);
        break;
      case "f":
        if (!free) return;
        if (document.fullscreenElement) document.exitFullscreen();
        else root.requestFullscreen();
        break;
      default:
        return;
    }
    event.preventDefault();
  });
}
