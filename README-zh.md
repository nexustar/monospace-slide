# Monospace Slide

[English](README.md)

一套等宽风格的幻灯片主题。所有内容都落在一张字符网格里：西文占一列，汉字占两列，标题、表格和代码块都是整数行高。

一份幻灯片就是一个 HTML 文件，每个 `section` 是一页。`slides.css` 负责排版，`slides.js` 负责翻页和缩放，`tools/check.mjs` 会把每一页渲染成图片，并指出放不下或对不齐的地方。

排版样式改自 [The Monospace Web](https://github.com/owickstrom/the-monospace-web)（MIT），字体用的是 [PlemoCJK](https://github.com/nexustar/PlemoCJK)。

## 放映

用浏览器打开 `index.html` 就能放映。它本身也是一份说明，把各种版式演示了一遍；`examples/plemocjk.html` 是一份完整的演讲稿，介绍 PlemoCJK 这款字体。

翻页用方向键、PageUp / PageDown 或空格（Shift + 空格往回翻），Home 和 End 跳到首尾，按 `f` 全屏。地址栏里的 `#3` 就是页码，改它可以直接跳页。

字体从 jsDelivr 加载，放映时要联网。现场网络靠不住的话，提前用 `npm run pdf` 导出一份 PDF，字体会嵌在里面。

## 检查

```sh
npm install
npm run check                # 检查 index.html，截图写到 shots/
npm run check -- deck.html   # 检查别的文件
npm run check -- --dark      # 用深色模式截图
npm run pdf                  # 顺便导出 index.pdf
```

检查脚本会调用本机的 Chromium。如果它装在不常见的位置，用 `CHROMIUM_PATH` 指过去。

## 写幻灯片

先记住两个数：一页是 96 列 × 18 行，扣掉四周的留白，能写内容的地方是 88 列 × 14 行。各种元素占的行数：

| 元素 | 行数 |
| --- | --- |
| `h2` 页标题 | 2，下面空 1 行，正文还剩 11 行 |
| `p`、`ul`、`ol`、`blockquote` | 文字有几行就占几行，块与块之间空 1 行 |
| `pre > code` 代码块 | 代码行数加 2，每行最多 84 列 |
| `table` | 每行 2，整张表再加 1 |
| `h1` 封面标题 | 每行文字占 3 |

版式用 class 来选：

- `section.cover`：封面。依次放 `h1`、副标题、`hr` 和 `p.meta`，`p.meta` 里的两个 `span` 分在左右两端
- `section.chapter`：章节页。放 `p.no`（章节号）、`h2` 和一句说明
- `div.cols`：两栏，各 42 列；加上 `three` 是三栏，各 28 列；加上 `aside` 是 56 列的主栏配 28 列的侧栏
- `figure > pre`：字符画，可以配一个 `figcaption`。和汉字混排时用 `pre.ascii-cjk`，制表符会占两列

图片要自己给高度，写成行高的整数倍，比如 `style="height: calc(var(--line-height) * 8)"`。其他尺寸和间距交给主题就好；如果在行内样式里改了高度，后面的内容会整体错位。

每次改完跑一遍 `npm run check`，再翻一遍 `shots/` 里的截图。报告里有两种结果：

- **FAIL**：有内容超出了内容区，或者比所在的盒子更宽，最常见的是代码行太长。这时把这一页拆成两页，或者删掉一些内容，字号保持原样。
- **warn**：某个元素的上沿落在了半行之间，它后面的内容都会跟着偏离网格。

## 其他语言

英文幻灯片照常写，在 `<html lang="en">` 上标好语言就行。PlemoCJK 各地区版本的西文部分完全一样，浏览器也只会下载用到的西文分片。

繁体中文、日文、韩文的汉字写法和简体不同，可以引用对应地区的字体包，主题会按 `lang` 自动选用。各版本的字宽一致，网格保持不变。

| `lang` | 字体包 |
| --- | --- |
| `en`、`zh-Hans` 和其他语言 | `https://cdn.jsdelivr.net/npm/plemocjk-sc@0.0.5/PlemoCJK-SC.min.css` |
| `zh-Hant`、`zh-TW`、`zh-HK`、`zh-MO` | `https://cdn.jsdelivr.net/npm/plemocjk-tc@0.0.5/PlemoCJK-TC.min.css` |
| `ja` | `https://cdn.jsdelivr.net/npm/plemocjk-jp@0.0.5/PlemoCJK-JP.min.css` |
| `ko` | `https://cdn.jsdelivr.net/npm/plemocjk-kr@0.0.5/PlemoCJK-KR.min.css` |

SC 的包放在最前面，其他地区的跟在后面。一页里夹着别的语言时，比如一段日文引文，就在那个元素上标 `lang="ja"`，再引用日文的字体包。只引用了 SC 的话，所有汉字都按简体的写法显示。
