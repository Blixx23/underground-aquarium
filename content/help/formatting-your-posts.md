---
title: Formatting your posts
category: Community
summary: The Markdown you can use in forum threads and replies (bold, lists, headings, links, images, tables, code), what isn't supported, and link rules.
order: 40
keywords: markdown, format, formatting, bold, italic, bullet list, numbered list, heading, quote, blockquote, link, hyperlink, image, embed picture, table, strikethrough, code block, bbcode, html, line break, new paragraph, emoji
pages: /forums/new, /forums/[category]/new, /forums/[category]/[thread]
---

Forum posts use Markdown, a simple way to add formatting by typing a few symbols. It works in the **Body** of a new thread and in every forum comment and reply. The boxes that support it say "Markdown supported".

## Where does formatting work?
- **Works:** forum thread bodies and forum comments and replies.
- **Doesn't work:** thread titles, feed posts, feed comments, tank descriptions and tank comments. Those show exactly what you type as plain text. Line breaks you type in feed posts and comments are kept as you typed them.

## How do I make text bold or italic?
- `**bold**` or `__bold__` shows as **bold**.
- `*italic*` or `_italic_` shows as *italic*.
- `***both***` shows as bold and italic.
- `~~crossed out~~` shows as crossed-out text (strikethrough).

## How do I start a new paragraph or line?
Leave a blank line between paragraphs. In Markdown, pressing Enter once and typing on the next line joins the two lines into one paragraph. This is the most common surprise when posting:

```
First paragraph.

Second paragraph.
```

## How do I make a bulleted or numbered list?
Start each line with `- ` (or `* `) for bullets, or a number and a period for a numbered list:

```
- Ammonia 0
- Nitrite 0
- Nitrate 20

1. Test the water
2. Change 25%
3. Test again tomorrow
```

Put a blank line before the list if it follows a paragraph. Indent a line by a few spaces to nest it under the item above.

Checklists work too: `- [ ] not done` and `- [x] done` show as a list with checkboxes (the boxes are for display only and can't be clicked).

## How do I add a heading?
Start a line with `#` symbols and a space:

- `# Big heading`
- `## Section heading`
- `### Smaller heading`

Headings are handy for long build journals and guides. Careful: a line that starts with `#` followed by a space always becomes a heading, so write "No. 1 tank" or put the text mid-sentence if you don't want that.

## How do I quote someone?
Start the line with `> `:

```
> My tank has been cloudy for three days.
```

It shows as an indented, italic quote with a line down the left. There's no automatic quote button, so copy the words you want to quote and add `> ` in front.

## How do I add a link?
- `[link text](address)` shows "link text" as a clickable link.
- A full web address typed on its own (starting with `http://`, `https://` or `www.`) becomes a link automatically.
- Links to pages on Underground Aquarium can be written as a path starting with a slash, for example `[Tank Builder](/tank-builder)` or `[my listing](/listing/your-listing-name)`.

Links to Underground Aquarium pages open in the same tab. Links to other websites open in a new tab and are marked so search engines don't treat them as endorsements. Unsafe link types are removed automatically.

Please follow the [community rules](/help/community-rules): no spam links, affiliate schemes or links that pull people off the site to trade.

## How do I show an image in a comment?
Uploading photos only works on the opening post of a thread (up to 4, see [Starting a forum thread](/help/starting-a-forum-thread)). In comments, you can display an image that's already online with:

```
![short description of the image](image address)
```

The address must point directly at the image file. If the image is later deleted from wherever it's hosted, it stops showing in your post.

## How do I make a table?
Separate columns with `|` and put a row of dashes under the header:

```
| Parameter | Reading |
|-----------|---------|
| pH        | 7.4     |
| Nitrate   | 20 ppm  |
```

Tables are great for water test logs and stocking lists.

## How do I show code or exact text?
- Wrap text in single backticks for inline code: `` `KH 4` ``.
- For several lines, put three backticks on a line above and below:

````
```
Day 1: ammonia 2 ppm
Day 7: nitrite spike
```
````

Text inside backticks is shown exactly as typed, so it's also a good way to show symbols like `*` or `#` without them turning into formatting.

## How do I add a divider line?
Put three dashes `---` on a line by themselves, with a blank line above. It draws a horizontal line across the post.

## Can I use HTML or BBCode?
No. HTML tags aren't run. They show up as plain text in your post, exactly as you typed them. BBCode like `[b]bold[/b]` or `[img]` from older forums isn't supported either and also shows as plain text. Use the Markdown shown here instead.

## Can I use emoji?
Yes. Type or paste emoji straight from your phone or computer's emoji keyboard. Shortcodes like `:fish:` aren't converted and stay as text.

## Is there a preview?
No, there's no preview button, and forum posts can't be edited after posting. For anything long or heavily formatted, check your symbols carefully before tapping **Post**, **Comment** or **Reply**. If a post comes out wrong, you can add a follow-up comment, or email support@undergroundaquarium.com if it needs removing.

## Common problems
**My lines all ran together.** Leave a blank line between paragraphs. A single line break doesn't start a new line.

**Part of my post turned into a giant heading.** A line started with `#` and a space. Avoid starting lines with `#`, or wrap it in backticks.

**My numbers became a list.** A line starting with a number and a period (like `1. `) becomes a numbered list. That's usually what you want; if not, put the number mid-sentence.

**Asterisks disappeared and text went italic.** Single `*` or `_` around words makes italics. Wrap the text in backticks to show the symbols as typed.

**My image doesn't show.** The address has to go straight to an image file, not a page containing the image, and the image must be publicly viewable. Photos you want to upload directly can only go on the opening post of a new thread.

**My HTML shows up as code.** HTML isn't supported. Use Markdown instead.
