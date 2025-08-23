import { useState, useEffect } from 'react';

interface BookInfo {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  progress?: number;
  narrator: string;
  lastPosition: number;
  duration?: number;
  description?: string;
  youtubeVideoId?: string;
  totalChapters?: number;
}

export const useAvailableBooks = () => {
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [recentBooks, setRecentBooks] = useState<BookInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      
      // Fetch all books and recent books in parallel
      const [booksResponse, recentResponse] = await Promise.all([
        fetch('/api/books'),
        fetch('/api/books/recent')
      ]);
      
      const [booksData, recentData] = await Promise.all([
        booksResponse.json(),
        recentResponse.json()
      ]);
      
      if (booksData.success) {
        setBooks(booksData.books);
      } else {
        setError(booksData.error || 'Failed to fetch books');
      }
      
      if (recentData.success) {
        setRecentBooks(recentData.books);
      }
    } catch (err) {
      console.error('[useAvailableBooks] Fetch error:', err);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);
  
  const refetch = async () => {
    setBooks([]);
    setRecentBooks([]);
    setError(null);
    setLoading(true);
    await fetchBooks();
  };

  return { 
    books, 
    recentBooks, 
    loading, 
    error,
    refetch
  };
};
