# Nifty Archives LNReader Plugin

A plugin for [LNReader](https://github.com/LNReader/lnreader) that allows users to search and read novels from Nifty Archives.

## Website Structure

- **Search Site:** https://search.niftyarchives.org/ (provides search results and book listings)
- **Content Site:** https://www.nifty.org/ (hosts actual chapter content)
- **Two URL patterns:**
  - Multi-chapter books: `/nifty/[category]/[title]/` (index page with chapter links)
  - Single-chapter books: `/nifty/[category]/[title]` (direct chapter content)

## Plugin Development

This plugin implements the lnreader Plugin API with the following core functions:

### 1. **searchNovels(searchTerm, page)**
- Query search.niftyarchives.org with search keywords
- Parse search results to extract novel metadata (title, author, cover, etc.)
- Support pagination

### 2. **popularNovels(page, options)**
- Implement category-based discovery (without search terms)
- Use URL: `https://search.niftyarchives.org/?keywords=&categories[]=gay&subcategories[]=adult-youth&sort=Newest`
- Support filtering by categories and subcategories

### 3. **parseNovelAndChapters(novelUrl)**
- Handle both single-chapter and multi-chapter book URL structures
- For multi-chapter books: parse the index page to extract chapter list
- For single-chapter books: treat the page as both index and content
- Extract novel metadata (title, author, summary, etc.)

### 4. **parseChapter(chapterUrl)**
- Extract chapter content from nifty.org pages
- **Important:** Clean hard line breaks/word wrapping:
  - Real line breaks are blank lines
  - Fake word wraps have letters immediately on left and right
  - Join lines that are just word-wrapped text
- Return clean HTML content

## Special Considerations

1. **Dual-site parsing:** Search results come from archives.org, but actual content is served from nifty.org
2. **URL transformation:** May need to convert archive.org search results into nifty.org content URLs
3. **Content cleaning:** The extracted text has hard-coded line breaks that need to be removed
4. **Category system:** Support category and subcategory filtering for discovery

## File Structure
