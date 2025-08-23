import React from "react";
import { Button, Input, Tabs, Tab } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useAvailableBooks } from "@/hooks/nara/use-available-books";

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
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectBook }) => {
  const { books, recentBooks } = useAvailableBooks();
  const [searchQuery, setSearchQuery] = React.useState("");
  
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
  
  return (
    <div className="min-h-screen max-h-screen overflow-hidden flex bg-[#f8f6f2] text-[#5d534f]">
      {/* Sidebar with wood texture - added min-width and max-width */}
      <div className="h-screen min-w-[12rem] max-w-[15vw] w-48 border-r border-[#d4b9a8] bg-gradient-to-b from-[#e6d7ce] to-[#d4b9a8] p-4 md:p-6 flex flex-col"
           style={{
             backgroundImage: `
               linear-gradient(to bottom, #e6d7ce, #d4b9a8),
               repeating-linear-gradient(
                 120deg,
                 rgba(255,255,255,0.1) 0px,
                 rgba(0,0,0,0.05) 4px,
                 rgba(255,255,255,0.05) 6px,
                 rgba(0,0,0,0.02) 10px
               )
             `
           }}
      >
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon icon="lucide:book-open" className="text-primary" width={16} />
            </div>
            <h1 className="text-xl font-semibold text-[#5d534f]">Nara</h1>
          </div>
          
          <nav className="space-y-2">
            <NavItem icon="lucide:home" label="Home" isActive={true} />
            <NavItem icon="lucide:library" label="My Library" />
            <NavItem icon="lucide:bookmark" label="Bookmarks" />
            <NavItem icon="lucide:history" label="History" />
            <NavItem icon="lucide:settings" label="Settings" />
          </nav>
        </div>
        
        <div className="mt-auto pt-6 border-t border-[#e8e4df]">
          <h3 className="text-sm font-medium mb-3">Recently Opened</h3>
          {recentBooks.slice(0, 1).map(book => (
            <div 
              key={book.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#e8e4df] cursor-pointer"
              onClick={() => onSelectBook(book.id)}
            >
              <img 
                src={book.coverUrl} 
                alt={book.title}
                className="w-12 h-16 object-cover rounded-sm shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium truncate">{book.title}</h4>
                <p className="text-xs text-[#8a817c] truncate">{book.author}</p>
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
        <header className="sticky top-0 z-10 bg-gradient-to-r from-[#f0ede8] via-[#f8f6f2] to-[#f0ede8] border-b border-[#d4b9a8] px-4 md:px-8 py-4 shadow-sm flex-shrink-0 min-h-[4rem]">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-[#5d534f]">My Learning Space</h1>
            
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Input
                  placeholder="Search books..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  startContent={<Icon icon="lucide:search" className="text-default-400" width={16} />}
                  classNames={{
                    base: "bg-[#f0ede8]",
                    inputWrapper: "bg-[#f0ede8] border-none"
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
                isIconOnly
                variant="light"
                aria-label="User profile"
                className="bg-[#f0ede8]"
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
          ? 'bg-[#e8e4df] text-[#5d534f] font-medium' 
          : 'text-[#8a817c] hover:bg-[#e8e4df]/50'}`}
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
}

const BookShelves: React.FC<BookShelvesProps> = ({ 
  currentlyReading, 
  nextUp, 
  finished, 
  onSelectBook 
}) => {
  return (
    <div className="space-y-16">
      {/* Currently Reading Section */}
      <BookShelf 
        title="Currently Reading"
        books={currentlyReading}
        onSelectBook={onSelectBook}
        emptyMessage="You're not reading any books right now."
        showProgress
      />
      
      {/* Recommended Section (renamed from Next Up) */}
      <BookShelf 
        title="Recommended for Startups"
        books={nextUp}
        onSelectBook={onSelectBook}
        emptyMessage="No recommendations available right now."
      />
      
      {/* Finished Section */}
      <BookShelf 
        title="Finished"
        books={finished}
        onSelectBook={onSelectBook}
        emptyMessage="You haven't finished any books yet."
      />
    </div>
  );
};

interface BookShelfProps {
  title: string;
  books: BookInfo[];
  onSelectBook: (bookId: string) => void;
  emptyMessage: string;
  showProgress?: boolean;
}

const BookShelf: React.FC<BookShelfProps> = ({ 
  title, 
  books, 
  onSelectBook, 
  emptyMessage,
  showProgress 
}) => {
  return (
    <section className="mb-16">
      <div className="flex justify-between items-center mb-12 pb-3 border-b border-[#d4b9a8]">
        <h2 className="text-2xl font-medium text-[#5d534f]">{title}</h2>
        <Button
          variant="light"
          size="sm"
          endContent={<Icon icon="lucide:chevron-right" width={16} />}
          className="text-[#8a817c]"
        >
          Full shelf
        </Button>
      </div>
      
      {books.length === 0 ? (
        <div className="h-48 flex items-center justify-center bg-[#f0ede8] rounded-lg">
          <p className="text-[#8a817c]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative">
          {/* 3D Shelf - Using relative height with min/max constraints */}
          <div className="relative h-[min(420px,50vh)] min-h-[300px] mb-8">
            {/* Shelf surface */}
            <div className="absolute bottom-0 left-0 right-0 h-[24px] bg-[#e8e4df] rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
              {/* Shelf front edge */}
              <div className="absolute bottom-0 left-0 right-0 h-[8px] bg-[#d8d4cf] rounded-b-sm"></div>
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
                  className="cursor-pointer flex-shrink-0 flex flex-col items-center"
                  onClick={() => onSelectBook(book.id)}
                >
                  <div className="relative flex flex-col items-center">
                    {/* Book cover - Using responsive sizing with min/max constraints */}
                    <div className="relative">
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
                    <p className="text-xs text-[#8a817c] line-clamp-1 mt-1">{book.author}</p>
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
