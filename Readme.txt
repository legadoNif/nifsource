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

## Available Categories & Subcategories

The search site supports the following categories and subcategories:

**Main Categories:**
- `gay` - LGBTQ+ content (primary category)
- `bisexual` - Bisexual themed content
- Others available on search site

**Subcategories (can apply to multiple main categories):**
- `adult-friends` - Adult relationships
- `adult-youth` - Age-gap relationships
- `athletics` - Sports-related content
- `authoritarian` - Power dynamics and control
- `beginnings` - Origin/starting stories
- `college` - University/college setting
- `highschool` - High school setting
- `incest` - Family-related content
- `sf-fantasy` - Science fiction and fantasy
- `young-friends` - Youth/coming-of-age stories

**API URL Pattern:**
```
https://search.niftyarchives.org/?keywords=[term]&categories[]=[category]&subcategories[]=[subcategory]&sort=Newest
```

Example: `?keywords=&categories[]=gay&subcategories[]=adult-youth&sort=Newest`

## Plugin API Reference

### Core Interface: `Plugin`

```typescript
export interface Plugin extends PluginItem {
  imageRequestInit: ImageRequestInit;
  filters?: Filters;
  pluginSettings?: PluginSettings;
  
  // Required methods
  popularNovels(pageNo: number, options?: PopularNovelsOptions<Filters>): Promise<NovelItem[]>;
  parseNovel(novelPath: string): Promise<SourceNovel>;
  parseChapter(chapterPath: string): Promise<string>;
  searchNovels(searchTerm: string, pageNo: number): Promise<NovelItem[]>;
  
  // Optional methods
  parsePage?(novelPath: string, page: string): Promise<SourcePage>;
  resolveUrl?(path: string, isNovel?: boolean): string;
  
  webStorageUtilized?: boolean;
}
```

### Data Types

**NovelItem** - Basic novel metadata
```typescript
interface NovelItem {
  id: undefined;
  name: string;
  path: string;
  cover?: string;
}
```

**SourceNovel** - Complete novel with chapters
```typescript
interface SourceNovel extends NovelItem {
  genres?: string;
  summary?: string;
  author?: string;
  artist?: string;
  status?: NovelStatus;
  chapters: ChapterItem[];
  totalPages?: number;
}
```

**NovelStatus** - Novel completion status
```typescript
enum NovelStatus {
  Unknown = 'Unknown',
  Ongoing = 'Ongoing',
  Completed = 'Completed',
  Licensed = 'Licensed',
  PublishingFinished = 'Publishing Finished',
  Cancelled = 'Cancelled',
  OnHiatus = 'On Hiatus',
}
```

**ChapterItem** - Chapter metadata
```typescript
interface ChapterItem {
  name: string;
  path: string;
  chapterNumber?: number;
  releaseTime?: string;
  page?: string;
}
```

### Plugin Helpers

#### Fetch Utilities (for HTTP requests)
```typescript
// Standard fetch with default headers
fetchApi(url: string, init?: FetchInit): Promise<Response>

// Fetch as plain text (handles encoding)
fetchText(url: string, init?: FetchInit, encoding?: string): Promise<string>

// Download file to destination
downloadFile(url: string, destPath: string, init?: FetchInit): Promise<void>

// Protobuf requests (for APIs using protobuf)
fetchProto(protoInit: ProtoRequestInit, url: string, init?: FetchInit): Promise<any>
```

#### Storage Utilities (for plugin persistence)
```typescript
// Main storage with expiry support
const storage = new Storage(pluginID);
storage.set(key: string, value: any, expires?: Date | number): void
storage.get(key: string, raw?: boolean): any
storage.delete(key: string): void
storage.clearAll(): void
storage.getAllKeys(): string[]

// WebView local storage
const localStorage = new LocalStorage(pluginID);
localStorage.get(): any

// WebView session storage
const sessionStorage = new SessionStorage(pluginID);
sessionStorage.get(): any
```

#### URL Utilities
```typescript
// Check if URL is absolute
isAbsoluteUrl(url: string): boolean
```

### Plugin Settings Types

Plugins can define configurable settings:

```typescript
// Text input
interface TextSetting {
  value: string;
  label: string;
  type?: 'Text';
}

// Toggle switch
interface SwitchSetting {
  value: boolean;
  label: string;
  type: 'Switch';
}

// Dropdown selection
interface SelectSetting {
  value: string;
  label: string;
  type: 'Select';
  options: SelectOption[];  // { label, value }
}

// Checkbox group
interface CheckboxGroupSetting {
  value: string[];
  label: string;
  type: 'CheckboxGroup';
  options: CheckboxOption[];  // { label, value }
}
```

## Implementation Notes

1. **Headers:** The fetchApi helper automatically includes:
   - User-Agent
   - Accept, Accept-Language, Accept-Encoding
   - Connection keep-alive
   - Cache-Control headers

2. **URL Resolution:** Use `resolveUrl()` to handle both absolute and relative URLs from the website

3. **Status Codes:** Check response status and handle errors gracefully in API calls

4. **Categories:** Implement filter support using the `filters` and `pluginSettings` properties for better user control

5. **Pagination:** Support both page numbers and query-based pagination

6. **Error Handling:** Return empty arrays on errors rather than throwing exceptions

## File Structure
