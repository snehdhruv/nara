import React from "react";
import { Button, Input, Tabs, Tab } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useAvailableBooks } from "@/hooks/nara/use-available-books";
import { YouTubeSearch } from "./youtube-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";

interface DashboardProps {
  onSelectBook: (bookId: string) => void;
}

interface BookInfo {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  progress?: number;
  narrator: string;
  lastPosition: number;
  duration?: string;
  genre?: string;
  rating?: number;
  publishedYear?: number;
  description?: string;
  tags?: string[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectBook }) => {
  const { books, recentBooks, refetch } = useAvailableBooks();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showYouTubeSearch, setShowYouTubeSearch] = React.useState(false);
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false);
  
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Filter books based on search query
  const filteredBooks = React.useMemo(() => {
    if (!searchQuery.trim()) return books;
    
    const query = searchQuery.toLowerCase();
    return books.filter(
      book => book.title.toLowerCase().includes(query) || 
              book.author.toLowerCase().includes(query)
    );
  }, [books, searchQuery]);

  // Group books by status
  const currentlyReading = recentBooks.slice(0, 3);
  const nextUpBooks = books.slice(0, 6);
  const finishedBooks = books.slice(6, 12);
  
  const handleYouTubeVideoSelect = async (videoId: string, metadata: any) => {
    console.log('[Dashboard] YouTube video selected:', videoId, metadata);
    
    try {
      // Add the audiobook to the books collection
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audiobook: metadata })
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to add book');
      }
      
      console.log('[Dashboard] Successfully added YouTube audiobook to collection', data);
      
      // Close the search modal first
      setShowYouTubeSearch(false);
      
      // Refresh the books list to include the new audiobook
      await refetch();
      
      // Wait a moment for state to update, then select the book
      setTimeout(() => {
        if (data.book?.id) {
          onSelectBook(data.book.id);
        }
      }, 100);
    } catch (error) {
      console.error('[Dashboard] Failed to add YouTube audiobook:', error);
      alert(`Failed to add audiobook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${bookTitle}"? This will also remove all your notes and progress for this audiobook.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/books?id=${bookId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete book');
      }
      
      console.log('[Dashboard] Successfully deleted audiobook');
      
      // Refresh the books list to reflect the deletion
      await refetch();
    } catch (error) {
      console.error('[Dashboard] Failed to delete audiobook:', error);
      alert(`Failed to delete audiobook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Show YouTube search overlay
  if (showYouTubeSearch) {
    return (
      <YouTubeSearch
        onVideoSelect={handleYouTubeVideoSelect}
        onCancel={() => setShowYouTubeSearch(false)}
      />
    );
  }
  
  // Get theme-aware colors
  const getThemeClasses = () => {
    switch (theme) {
      case 'minimalist':
        return {
          container: 'bg-background text-foreground',
          sidebar: 'bg-card border-border',
          header: 'bg-card/50 border-border'
        }
      case 'rich':
        return {
          container: 'bg-background text-foreground',
          sidebar: 'bg-card border-border',
          header: 'bg-card/50 border-border'
        }
      case 'tech':
        return {
          container: 'bg-background text-foreground',
          sidebar: 'bg-card border-border',
          header: 'bg-card/50 border-border'
        }
      case 'dark':
        return {
          container: 'bg-background text-foreground',
          sidebar: 'bg-card border-border',
          header: 'bg-card/50 border-border'
        }
      default:
        return {
          container: 'bg-[#f8f6f2] text-[#5d534f]',
          sidebar: 'bg-gradient-to-b from-[#e6d7ce] to-[#d4b9a8] border-[#d4b9a8]',
          header: 'bg-gradient-to-r from-[#f0ede8] via-[#f8f6f2] to-[#f0ede8] border-[#d4b9a8]'
        }
    }
  }

  const themeClasses = getThemeClasses()

  return (
    <div className={`min-h-screen max-h-screen overflow-hidden flex ${themeClasses.container}`}>
      {/* Sidebar with wood texture - added min-width and max-width */}
      <div 
        className={`h-screen min-w-[12rem] max-w-[15vw] w-48 border-r ${themeClasses.sidebar} ${isMounted && theme === 'light' ? 'wood-texture-bg' : ''} p-4 md:p-6 flex flex-col`}
      >
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon icon="lucide:book-open" className="text-primary" width={16} />
            </div>
            <h1 className="text-xl font-semibold">Nara</h1>
          </div>
          
          <nav className="space-y-2">
            <NavItem icon="lucide:home" label="Home" isActive={true} />
            <NavItem icon="lucide:library" label="My Library" />
            <NavItem icon="lucide:bookmark" label="Bookmarks" />
            <NavItem icon="lucide:history" label="History" />
            <NavItem icon="lucide:settings" label="Settings" />
          </nav>
        </div>
        
        <div className="mt-auto pt-6 border-t border-border">
          <h3 className="text-sm font-medium mb-3">Recently Opened</h3>
          {recentBooks.slice(0, 1).map(book => (
            <div 
              key={book.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
              onClick={() => onSelectBook(book.id)}
              data-testid="book-item"
            >
              <img 
                src={book.coverUrl} 
                alt={book.title}
                className="w-12 h-16 object-cover rounded-sm shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium truncate">{book.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{book.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Content - changed from pl-48 to flex-1 with overflow handling */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.01), rgba(0,0,0,0), rgba(0,0,0,0.01)),
          linear-gradient(to bottom, rgba(0,0,0,0.01), rgba(0,0,0,0), rgba(0,0,0,0.01))
        `
      }}>
        {/* Header - added min-height and flex-shrink-0 */}
        <header className={`sticky top-0 z-10 ${themeClasses.header} border-b px-4 md:px-8 py-4 shadow-sm flex-shrink-0 min-h-[4rem]`}>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold">My Learning Space</h1>
            
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Input
                  placeholder="Search books..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  startContent={<Icon icon="lucide:search" className="text-default-400" width={16} />}
                  classNames={{
                    base: "bg-background/50",
                    inputWrapper: "bg-background/50 border border-border"
                  }}
                />
                {searchQuery && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onPress={() => setSearchQuery("")}
                  >
                    <Icon icon="lucide:x" width={14} />
                  </Button>
                )}
              </div>
              
              <Button
                onPress={() => setShowYouTubeSearch(true)}
                color="primary"
                startContent={<Icon icon="lucide:youtube" width={16} />}
              >
                Add YouTube
              </Button>
              
              <ThemeToggle />
              
              <Button
                isIconOnly
                variant="light"
                aria-label="User profile"
                className="bg-background/50 border border-border"
              >
                <Icon icon="lucide:user" width={18} />
              </Button>
            </div>
          </div>
        </header>
        
        {/* Main content - added overflow handling */}
        <main className="px-4 md:px-8 py-6 flex-1 overflow-y-auto">
          {searchQuery ? (
            <SearchResults books={filteredBooks} onSelectBook={onSelectBook} query={searchQuery} />
          ) : (
            <BookShelves 
              currentlyReading={currentlyReading}
              nextUp={nextUpBooks}
              finished={finishedBooks}
              onSelectBook={onSelectBook}
              onDeleteBook={handleDeleteBook}
            />
          )}
        </main>
      </div>
    </div>
  );
};

interface NavItemProps {
  icon: string;
  label: string;
  isActive?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive }) => {
  return (
    <div 
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
        ${isActive 
          ? 'bg-primary/10 text-foreground font-medium' 
          : 'text-muted-foreground hover:bg-accent/50'}`}
    >
      <Icon icon={icon} width={18} />
      <span className="text-sm">{label}</span>
    </div>
  );
};

interface BookShelvesProps {
  currentlyReading: BookInfo[];
  nextUp: BookInfo[];
  finished: BookInfo[];
  onSelectBook: (bookId: string) => void;
  onDeleteBook?: (bookId: string, bookTitle: string) => void;
}

const BookShelves: React.FC<BookShelvesProps> = ({ 
  currentlyReading, 
  nextUp, 
  finished, 
  onSelectBook,
  onDeleteBook 
}) => {
  return (
    <div className="space-y-16">
      {/* Recommended Section (renamed from Next Up) */}
      <BookShelf 
        title="Recommended for Startups"
        books={nextUp}
        onSelectBook={onSelectBook}
        onDeleteBook={onDeleteBook}
        emptyMessage="No recommendations available right now."
      />
      
      {/* Finished Section */}
      <BookShelf 
        title="Finished"
        books={finished}
        onSelectBook={onSelectBook}
        onDeleteBook={onDeleteBook}
        emptyMessage="You haven't finished any books yet."
      />
    </div>
  );
};

interface BookShelfProps {
  title: string;
  books: BookInfo[];
  onSelectBook: (bookId: string) => void;
  onDeleteBook?: (bookId: string, bookTitle: string) => void;
  emptyMessage: string;
  showProgress?: boolean;
}

const BookShelf: React.FC<BookShelfProps> = ({ 
  title, 
  books, 
  onSelectBook, 
  onDeleteBook,
  emptyMessage,
  showProgress 
}) => {
  return (
    <section className="mb-16">
      <div className="flex justify-between items-center mb-12 pb-3 border-b border-border">
        <h2 className="text-2xl font-medium text-foreground">{title}</h2>
        <Button
          variant="light"
          size="sm"
          endContent={<Icon icon="lucide:chevron-right" width={16} />}
          className="text-muted-foreground"
        >
          Full shelf
        </Button>
      </div>
      
      {books.length === 0 ? (
        <div className="h-48 flex items-center justify-center bg-muted rounded-lg">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative">
          {/* 3D Shelf - Using relative height with min/max constraints */}
          <div className="relative h-[min(420px,50vh)] min-h-[300px] mb-8">
            {/* Shelf surface */}
            <div className="absolute bottom-0 left-0 right-0 h-[24px] bg-muted rounded-sm shadow-sm">
              {/* Shelf front edge */}
              <div className="absolute bottom-0 left-0 right-0 h-[8px] bg-border rounded-b-sm"></div>
            </div>
            
            {/* Subtle shelf shadow */}
            <div className="absolute bottom-[-10px] left-[10px] right-[10px] h-[8px] bg-black/10 blur-md rounded-full"></div>
            
            {/* Books on shelf - Improved alignment and organization */}
            <div className={`absolute bottom-[32px] left-0 right-0 px-4 md:px-6 flex ${books.length <= 3 ? 'justify-center' : 'justify-start'} gap-4 md:gap-6 lg:gap-8 overflow-x-auto pb-4 scrollbar-hidden`}>
              {books.map((book) => (
                <motion.div
                  key={book.id}
                  // Enhanced hover effect
                  whileHover={{ y: -15, rotateY: 5, rotateZ: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="cursor-pointer flex-shrink-0 flex flex-col items-center relative group"
                >
                  <div className="relative flex flex-col items-center">
                    {/* Delete button - visible on hover */}
                    {onDeleteBook && (
                      <Button
                        isIconOnly
                        size="sm"
                        variant="flat"
                        color="danger"
                        className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 hover:bg-red-600 text-white rounded-full"
                        onPress={() => onDeleteBook(book.id, book.title)}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                        }}
                        aria-label={`Delete ${book.title}`}
                      >
                        <Icon icon="lucide:x" width={14} />
                      </Button>
                    )}

                    {/* Book cover - Using responsive sizing with min/max constraints */}
                    <div 
                      className="relative"
                      onClick={() => onSelectBook(book.id)}
                    >
                      <img 
                        src={book.coverUrl} 
                        alt={book.title}
                        className="w-[clamp(100px,14vw,200px)] h-[clamp(150px,20vw,280px)] object-cover rounded-sm shadow-[6px_6px_12px_rgba(0,0,0,0.15)]"
                      />
                        
                      {/* Book spine/side effect - thicker */}
                      <div className="absolute top-0 bottom-0 right-[-6px] w-[6px] bg-[#d0ccc7] rounded-r-sm"></div>
                      
                      {/* Book bottom edge - thicker */}
                      <div className="absolute bottom-[-6px] left-0 right-0 h-[6px] bg-[#d0ccc7] rounded-b-sm"></div>

                      {/* Book shadow on shelf */}
                      <div className="absolute bottom-[-12px] left-[10%] right-[10%] h-[4px] bg-black/15 blur-sm rounded-full"></div>

                      {showProgress && book.progress !== undefined && (
                        <div className="absolute bottom-4 left-4 right-4 bg-black/60 rounded-sm px-3 py-2">
                          <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full" 
                              style={{ width: `${book.progress * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 w-[clamp(100px,14vw,200px)] text-center">
                    <h3 className="text-sm font-medium line-clamp-2 leading-tight">{book.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{book.author}</p>
                    
                    {/* Enhanced metadata */}
                    <div className="mt-2 space-y-1">
                      {book.duration && (
                        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                          <Icon icon="lucide:clock" width={12} />
                          <span>{book.duration}</span>
                        </div>
                      )}
                      
                      {book.rating && (
                        <div className="flex items-center justify-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Icon
                              key={i}
                              icon={i < Math.floor(book.rating!) ? "lucide:star" : "lucide:star"}
                              width={10}
                              className={i < Math.floor(book.rating!) ? "text-yellow-400" : "text-gray-300"}
                            />
                          ))}
                          <span className="text-xs text-muted-foreground ml-1">
                            {book.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                      
                      {book.genre && (
                        <div className="inline-flex px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                          {book.genre}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

interface SearchResultsProps {
  books: BookInfo[];
  onSelectBook: (bookId: string) => void;
  query: string;
}

const SearchResults: React.FC<SearchResultsProps> = ({ books, onSelectBook, query }) => {
  const [activeTab, setActiveTab] = React.useState("all");
  
  // Filter books by category based on active tab
  const filteredBooks = React.useMemo(() => {
    if (activeTab === "all") return books;
    
    // This is just a placeholder - in a real app, you'd have actual categories
    const categoryMap: Record<string, number[]> = {
      "business": [0, 3, 6],
      "fiction": [1, 4, 7],
      "science": [2, 5, 8]
    };
    
    const categoryIndices = categoryMap[activeTab] || [];
    return books.filter((_, index) => categoryIndices.includes(index));
  }, [books, activeTab]);

  return (
    <div className="max-w-full">
      <div className="mb-6">
        <h2 className="text-xl font-medium mb-2">
          Search results for &quot;{query}&quot;
        </h2>
        <p className="text-[#8a817c]">
          Found {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
        </p>
      </div>
      
      <Tabs 
        aria-label="Book categories" 
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        classNames={{
          tabList: "gap-4",
          cursor: "bg-primary",
          tab: "px-2 py-1 text-sm"
        }}
        variant="underlined"
        color="primary"
      >
        <Tab key="all" title="All Books" />
        <Tab key="business" title="Business" />
        <Tab key="fiction" title="Fiction" />
        <Tab key="science" title="Science" />
      </Tabs>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 mt-6">
        {filteredBooks.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <Icon icon="lucide:search-x" className="mx-auto mb-4 text-[#8a817c]" width={32} />
            <p className="text-[#8a817c]">No books found matching your search.</p>
          </div>
        ) : (
          filteredBooks.map((book) => (
            <motion.div
              key={book.id}
              whileHover={{ y: -5, scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="cursor-pointer"
              onClick={() => onSelectBook(book.id)}
            >
              <img 
                src={book.coverUrl} 
                alt={book.title}
                className="w-full aspect-[2/3] object-cover rounded-md shadow-md mb-3"
              />
              <h3 className="text-sm font-medium line-clamp-1">{book.title}</h3>
              <p className="text-xs text-[#8a817c] line-clamp-1">{book.author}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
