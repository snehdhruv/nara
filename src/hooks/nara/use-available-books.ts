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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/books');
      const data = await response.json();
      
      if (data.success) {
        setBooks(data.books);
      } else {
        setError(data.error || 'Failed to fetch books');
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

  // Recent books (books with progress > 0 but < 1)
  const recentBooks = books.filter(book => book.progress && book.progress > 0 && book.progress < 1);
  
  const refetch = async () => {
    setBooks([]);
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
