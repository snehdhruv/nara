import React from "react";
import { Button, Input, Select, SelectItem, Chip } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useAvailableBooks } from "@/hooks/nara/use-available-books";

interface MyLibraryProps {
  onSelectBook: (bookId: string) => void;
}

export const MyLibrary: React.FC<MyLibraryProps> = ({ onSelectBook }) => {
  const { books, refetch } = useAvailableBooks();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("recent");
  const [filterBy, setFilterBy] = React.useState("all");

  // Filter and sort books
  const filteredBooks = React.useMemo(() => {
    let filtered = books.filter(book => {
      const matchesSearch = !searchQuery || 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filterBy === "all" || 
        (filterBy === "youtube" && book.youtubeVideoId) ||
        (filterBy === "completed" && book.progress >= 0.9) ||
        (filterBy === "in-progress" && book.progress > 0 && book.progress < 0.9);
      
      return matchesSearch && matchesFilter;
    });

    // Sort books
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0);
        case "title":
          return a.title.localeCompare(b.title);
        case "author":
          return a.author.localeCompare(b.author);
        case "progress":
          return (b.progress || 0) - (a.progress || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [books, searchQuery, sortBy, filterBy]);

  const handleDeleteBook = async (bookId: string, bookTitle: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${bookTitle}"? This will also remove all your notes and progress for this audiobook.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/books?id=${bookId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await refetch();
      } else {
        alert('Failed to delete audiobook. Please try again.');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete audiobook. Please try again.');
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 0.9) return "success";
    if (progress >= 0.5) return "warning";
    if (progress > 0) return "primary";
    return "default";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          My Library
        </h1>
        
        {/* Search and Filters */}
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startContent={<Icon icon="lucide:search" className="w-4 h-4 text-gray-400" />}
            className="flex-1"
            variant="bordered"
          />
          
          <Select
            placeholder="Sort by"
            selectedKeys={[sortBy]}
            onSelectionChange={(keys) => setSortBy(Array.from(keys)[0] as string)}
            className="w-40"
            variant="bordered"
          >
            <SelectItem key="recent">Recently Played</SelectItem>
            <SelectItem key="title">Title</SelectItem>
            <SelectItem key="author">Author</SelectItem>
            <SelectItem key="progress">Progress</SelectItem>
          </Select>
          
          <Select
            placeholder="Filter"
            selectedKeys={[filterBy]}
            onSelectionChange={(keys) => setFilterBy(Array.from(keys)[0] as string)}
            className="w-40"
            variant="bordered"
          >
            <SelectItem key="all">All Books</SelectItem>
            <SelectItem key="in-progress">In Progress</SelectItem>
            <SelectItem key="completed">Completed</SelectItem>
            <SelectItem key="youtube">YouTube</SelectItem>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
          <span>{books.length} books total</span>
          <span>{books.filter(b => b.progress > 0).length} started</span>
          <span>{books.filter(b => b.progress >= 0.9).length} completed</span>
        </div>
      </div>

      {/* Books Grid */}
      <div className="flex-1 overflow-auto p-6">
        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <Icon icon="lucide:book-open" className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? "No books found" : "No books in your library"}
            </h3>
            <p className="text-center">
              {searchQuery 
                ? "Try adjusting your search or filters" 
                : "Add some audiobooks to get started"
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer"
                onClick={() => onSelectBook(book.id)}
              >
                {/* Cover Image */}
                <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon icon="lucide:book" className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Progress overlay */}
                  {book.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/20">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${book.progress * 100}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Delete button */}
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="solid"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteBook(book.id, book.title, e)}
                  >
                    <Icon icon="lucide:trash-2" className="w-4 h-4" />
                  </Button>
                </div>

                {/* Book Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
                    {book.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-2 line-clamp-1">
                    by {book.author}
                  </p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {book.youtubeVideoId && (
                      <Chip size="sm" variant="flat" color="danger" className="text-xs">
                        YouTube
                      </Chip>
                    )}
                    {book.progress >= 0.9 && (
                      <Chip size="sm" variant="flat" color="success" className="text-xs">
                        Completed
                      </Chip>
                    )}
                    {book.progress > 0 && book.progress < 0.9 && (
                      <Chip size="sm" variant="flat" color={getProgressColor(book.progress)} className="text-xs">
                        {Math.round(book.progress * 100)}%
                      </Chip>
                    )}
                  </div>
                  
                  {/* Duration */}
                  {book.duration && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDuration(book.duration)}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};