import { CheerioAPI, load as parseHTML } from 'cheerio';
import { fetchApi } from '@libs/fetch';
import { Plugin } from '@/types/plugin';
import { Filters, FilterTypes } from '@libs/filterInputs';
import { defaultCover } from '@libs/defaultCover';

class NiftyArchives implements Plugin.PluginBase {
  id = 'niftyarchives';
  name = 'Nifty Archives';
  version = '1.0.0';
  icon = 'src/en/niftyarchives/icon.png';
  site = 'https://www.nifty.org/';
  searchSite = 'https://search.niftyarchives.org/';

  /**
   * Parse novel items from a Cheerio-loaded HTML element
   * Extracts title, category, subcategories, and chapters
   */
  parseNovels(loadedCheerio: CheerioAPI): Plugin.NovelItem[] {
    const novels: Plugin.NovelItem[] = [];
    const processedTitles = new Set<string>();

    loadedCheerio('tr').each((idx, ele) => {
      const titleLink = loadedCheerio(ele).find(
        'a[style*="font-size: 1.5em"]',
      );
      if (titleLink.length === 0) return;

      const novelName = titleLink.text().trim();
      const novelHref = titleLink.attr('href')?.trim();

      // Skip if we've already processed this title (avoid duplicates)
      if (!novelName || processedTitles.has(novelName)) return;

      if (!novelHref) return;

      // Format: https://www.nifty.org/nifty/[category]/[subcategory]/[title] or /nifty/[category]/[subcategory]/[title]
      // We want to store the path relative to the site
      const path = novelHref.replace(/^https?:\/\/[^\/]+/, '');

      // Check if this is a multi-chapter book (contains /) or single-chapter (no trailing /)
      const isMultiChapter = !path.endsWith('/');

      const novel: Plugin.NovelItem = {
        name: novelName,
        cover: defaultCover,
        path: path,
      };

      novels.push(novel);
      processedTitles.add(novelName);
    });

    return novels;
  }

  /**
   * Popular novels with category filtering
   * Uses the search site with category parameters
   */
  async popularNovels(
    page: number,
    { showLatestNovels, filters }: Plugin.PopularNovelsOptions<Filters>,
  ): Promise<Plugin.NovelItem[]> {
    // Build URL with filters
    let url = `${this.searchSite}?keywords=`;

    // Add category if specified in filters
    if (filters?.category?.value) {
      url += `&categories[]=${filters.category.value}`;
    }

    // Add subcategory if specified in filters
    if (filters?.subcategory?.value) {
      url += `&subcategories[]=${filters.subcategory.value}`;
    }

    // Add sort parameter
    if (filters?.sort?.value) {
      url += `&sort=${filters.sort.value}`;
    } else {
      url += `&sort=Newest`;
    }

    // Add pagination
    if (page > 1) {
      url += `&page=${page}`;
    }

    try {
      const body = await fetchApi(url).then(r => r.text());
      const loadedCheerio = parseHTML(body);
      return this.parseNovels(loadedCheerio);
    } catch (error) {
      console.error('Error fetching popular novels:', error);
      return [];
    }
  }

  /**
   * Parse novel details and chapters
   * Handles both single-chapter and multi-chapter book structures
   */
  async parseNovel(novelPath: string): Promise<Plugin.SourceNovel> {
    try {
      const novelUrl = new URL(novelPath, this.site).toString();
      const response = await fetchApi(novelUrl);
      const body = await response.text();
      const loadedCheerio = parseHTML(body);

      // Extract basic info from the title and URL
      // novelPath format: /nifty/[category]/[subcategory]/[title] or /nifty/[category]/[subcategory]/[title]/[title]-1
      const pathParts = novelPath.split('/').filter(p => p);
      const title = pathParts[pathParts.length - 1] || 'Unknown';
      const category = pathParts.length > 2 ? pathParts[1] : '';
      const subcategory = pathParts.length > 2 ? pathParts[2] : '';

      const novel: Plugin.SourceNovel = {
        path: novelPath,
        name: title.replace(/-/g, ' '),
        cover: defaultCover,
        status: 'Unknown',
        chapters: [],
        genres: subcategory ? subcategory.replace(/-/g, ' ') : '',
        summary: `Category: ${category.replace(/-/g, ' ')}\nSubcategory: ${subcategory.replace(/-/g, ' ')}`,
      };

      // Check if this is a single chapter or multi-chapter book
      // Multi-chapter books have an index page with chapter links
      // Single chapter books are the content directly

      // Try to extract chapters from index page
      const chapterLinks = loadedCheerio('a[href*="/nifty/"]')
        .filter((i, el) => {
          const href = loadedCheerio(el).attr('href') || '';
          // Match chapter links like /nifty/gay/college/title/title-1
          return /\/nifty\/[^\/]+\/[^\/]+\/[^\/]+\/[^\/]+-\d+/.test(href);
        })
        .get();

      if (chapterLinks.length > 0) {
        // Multi-chapter book: extract chapters from index page
        const chapters: Plugin.ChapterItem[] = [];
        const uniqueChapters = new Map<string, string>();

        chapterLinks.forEach(el => {
          const href = loadedCheerio(el).attr('href') || '';
          const chapterName = loadedCheerio(el).text().trim();

          // Avoid duplicates
          if (!uniqueChapters.has(href)) {
            uniqueChapters.set(href, chapterName);
            chapters.push({
              name: chapterName || `Chapter ${chapters.length + 1}`,
              path: href,
            });
          }
        });

        novel.chapters = chapters;
      } else {
        // Single-chapter book: treat the page itself as one chapter
        novel.chapters = [
          {
            name: title.replace(/-/g, ' '),
            path: novelPath,
          },
        ];
      }

      return novel;
    } catch (error) {
      console.error('Error parsing novel:', error);
      return {
        path: novelPath,
        name: 'Error',
        cover: defaultCover,
        status: 'Unknown',
        chapters: [],
      };
    }
  }

  /**
   * Parse chapter content from nifty.org
   * Removes formatting artifacts and cleans up the text
   */
  async parseChapter(chapterPath: string): Promise<string> {
    try {
      const chapterUrl = new URL(chapterPath, this.site).toString();
      const response = await fetchApi(chapterUrl);
      const body = await response.text();
      const loadedCheerio = parseHTML(body);

      // Remove script tags and style tags
      loadedCheerio('script').remove();
      loadedCheerio('style').remove();

      // Look for the main content area
      // Nifty uses various content containers, try to find the actual story text
      let content = '';

      // Try to find pre-formatted text (common on nifty)
      const preContent = loadedCheerio('pre').html();
      if (preContent) {
        content = preContent;
      }

      // Try body content if no pre tag
      if (!content) {
        const bodyContent = loadedCheerio('body').html();
        if (bodyContent) {
          content = bodyContent;
        }
      }

      if (!content) {
        return '';
      }

      // Clean up the content:
      // 1. Convert to text and back to preserve structure
      const tempCheerio = parseHTML(`<div>${content}</div>`);
      tempCheerio('script').remove();
      tempCheerio('style').remove();

      // Get the HTML to return to lnreader
      let cleanContent = tempCheerio('body').html() || tempCheerio('div').html() || '';

      // Replace multiple spaces with single space
      cleanContent = cleanContent.replace(/\s+/g, ' ');

      // Convert spaces back to proper line breaks where needed
      cleanContent = cleanContent.replace(/\n\s*\n/g, '</p><p>');

      // Wrap in paragraphs for better formatting
      if (cleanContent && !cleanContent.includes('<p')) {
        cleanContent = `<p>${cleanContent}</p>`;
      }

      return cleanContent;
    } catch (error) {
      console.error('Error parsing chapter:', error);
      return '';
    }
  }

  /**
   * Search for novels by keyword
   */
  async searchNovels(
    searchTerm: string,
    page: number,
  ): Promise<Plugin.NovelItem[]> {
    try {
      const searchUrl =
        `${this.searchSite}?keywords=${encodeURIComponent(searchTerm)}` +
        (page > 1 ? `&page=${page}` : '');

      const body = await fetchApi(searchUrl).then(r => r.text());
      const loadedCheerio = parseHTML(body);

      return this.parseNovels(loadedCheerio);
    } catch (error) {
      console.error('Error searching novels:', error);
      return [];
    }
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  resolveUrl(path: string, isNovel?: boolean): string {
    if (!path) return this.site;

    // If already absolute, return as-is
    if (path.startsWith('http')) {
      return path;
    }

    // If relative to site root
    if (path.startsWith('/')) {
      return new URL(path, this.site).toString();
    }

    // Otherwise append to site
    return this.site + path;
  }

  // Filter options for category browsing
  filters = {
    category: {
      value: 'gay',
      label: 'Category',
      options: [
        { label: 'Gay', value: 'gay' },
        { label: 'Bisexual', value: 'bisexual' },
      ],
      type: FilterTypes.Picker,
    },
    subcategory: {
      value: '',
      label: 'Subcategory',
      options: [
        { label: 'All', value: '' },
        { label: 'Adult-Friends', value: 'adult-friends' },
        { label: 'Adult-Youth', value: 'adult-youth' },
        { label: 'Athletics', value: 'athletics' },
        { label: 'Authoritarian', value: 'authoritarian' },
        { label: 'Beginnings', value: 'beginnings' },
        { label: 'College', value: 'college' },
        { label: 'Highschool', value: 'highschool' },
        { label: 'Incest', value: 'incest' },
        { label: 'SF-Fantasy', value: 'sf-fantasy' },
        { label: 'Young-Friends', value: 'young-friends' },
      ],
      type: FilterTypes.Picker,
    },
    sort: {
      value: 'Newest',
      label: 'Sort By',
      options: [
        { label: 'Newest', value: 'Newest' },
        { label: 'Most Popular', value: 'PopularAllTime' },
        { label: 'Recently Updated', value: 'RecentlyUpdated' },
        { label: 'Title', value: 'Title' },
      ],
      type: FilterTypes.Picker,
    },
  } as Filters;
}

export default new NiftyArchives();
