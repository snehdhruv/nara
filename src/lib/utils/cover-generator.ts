interface CoverOptions {
  title: string;
  author: string;
  youtubeVideoId?: string;
}

interface GoogleBooksApiResponse {
  items?: Array<{
    volumeInfo: {
      title: string;
      authors?: string[];
      imageLinks?: {
        thumbnail?: string;
        smallThumbnail?: string;
        small?: string;
        medium?: string;
        large?: string;
        extraLarge?: string;
      };
    };
  }>;
}

async function searchGoogleBooks(title: string, author: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`intitle:"${title}" inauthor:"${author}"`);
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
    
    if (!response.ok) {
      console.warn('Google Books API request failed:', response.status);
      return null;
    }

    const data: GoogleBooksApiResponse = await response.json();
    
    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      const imageLinks = book.volumeInfo.imageLinks;
      
      if (imageLinks) {
        // Prefer higher resolution images
        return imageLinks.extraLarge || 
               imageLinks.large || 
               imageLinks.medium || 
               imageLinks.small || 
               imageLinks.thumbnail ||
               imageLinks.smallThumbnail ||
               null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error searching Google Books:', error);
    return null;
  }
}

export async function generateCoverUrl(options: CoverOptions): Promise<string> {
  const { title, author, youtubeVideoId } = options;
  
  // First try Google Books API for the best covers
  const googleBooksCover = await searchGoogleBooks(title, author);
  if (googleBooksCover) {
    console.log(`[Cover Generator] Found Google Books cover for "${title}"`);
    return googleBooksCover;
  }
  
  // If we have a YouTube video ID, use the YouTube thumbnail
  if (youtubeVideoId) {
    console.log(`[Cover Generator] Using YouTube thumbnail for "${title}"`);
    return `https://i.ytimg.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
  }
  
  // Fallback to generated cover using the title and author
  const titleEncoded = encodeURIComponent(title.substring(0, 50)); // Limit length
  const authorEncoded = encodeURIComponent(author.substring(0, 30));
  
  console.log(`[Cover Generator] Using generated cover for "${title}"`);
  return `https://img.heroui.chat/image/book?w=400&h=600&title=${titleEncoded}&author=${authorEncoded}`;
}

export function validateCoverUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}