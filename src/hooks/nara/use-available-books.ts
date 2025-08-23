//

export const useAvailableBooks = () => {
  // Sample books data
  const books = [
    {
      id: "atomic-habits",
      title: "Atomic Habits",
      author: "James Clear",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=atomic-habits",
      progress: 0.35,
      narrator: "James Clear",
      lastPosition: 1850
    },
    {
      id: "deep-work",
      title: "Deep Work",
      author: "Cal Newport",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=deep-work",
      progress: 0.68,
      narrator: "Jeff Bottoms",
      lastPosition: 4230
    },
    {
      id: "strategic-writing",
      title: "Strategic Writing for UX",
      author: "Torrey Podmajersky",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=strategic-writing",
      progress: 0.12,
      narrator: "Lisa Coleman",
      lastPosition: 890
    },
    {
      id: "lord-of-rings",
      title: "The Lord of the Rings",
      author: "J.R.R. Tolkien",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=lord-rings",
      progress: 0,
      narrator: "Andy Serkis",
      lastPosition: 0
    },
    {
      id: "1984",
      title: "1984",
      author: "George Orwell",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=1984",
      progress: 0,
      narrator: "Simon Prebble",
      lastPosition: 0
    },
    {
      id: "design-everyday",
      title: "The Design of Everyday Things",
      author: "Don Norman",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=design-everyday",
      progress: 0,
      narrator: "Neil Hellegers",
      lastPosition: 0
    },
    {
      id: "zero-to-one",
      title: "Zero to One",
      author: "Peter Thiel",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=zero-to-one",
      progress: 0,
      narrator: "Blake Masters",
      lastPosition: 0
    },
    {
      id: "lean-startup",
      title: "The Lean Startup",
      author: "Eric Ries",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=lean-startup",
      progress: 0,
      narrator: "Eric Ries",
      lastPosition: 0
    },
    {
      id: "start-with-why",
      title: "Start With Why",
      author: "Simon Sinek",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=start-with-why",
      progress: 0,
      narrator: "Simon Sinek",
      lastPosition: 0
    },
    {
      id: "good-to-great",
      title: "Good to Great",
      author: "Jim Collins",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=good-to-great",
      progress: 0,
      narrator: "Jim Collins",
      lastPosition: 0
    },
    {
      id: "built-to-last",
      title: "Built to Last",
      author: "Jim Collins",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=built-to-last",
      progress: 0,
      narrator: "Jim Collins",
      lastPosition: 0
    },
    {
      id: "hooked",
      title: "Hooked: Building Habit-Forming Products",
      author: "Nir Eyal",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=hooked",
      progress: 0,
      narrator: "Dave Wright",
      lastPosition: 0
    },
    {
      id: "psychology-money",
      title: "The Psychology of Money",
      author: "Morgan Housel",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=psychology-money",
      progress: 1,
      narrator: "Chris Hill",
      lastPosition: 7200
    },
    {
      id: "one-thing",
      title: "The One Thing",
      author: "Gary Keller",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=one-thing",
      progress: 1,
      narrator: "Timothy Miller",
      lastPosition: 6300
    },
    {
      id: "101-essays",
      title: "101 Essays That Will Change The Way You Think",
      author: "Brianna Wiest",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=101-essays",
      progress: 1,
      narrator: "Abby Craden",
      lastPosition: 8100
    },
    {
      id: "sapiens",
      title: "Sapiens",
      author: "Yuval Noah Harari",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=sapiens",
      progress: 1,
      narrator: "Derek Perkins",
      lastPosition: 11250
    },
    {
      id: "logo-design",
      title: "Logo Design Love",
      author: "David Airey",
      coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=logo-design",
      progress: 1,
      narrator: "David Airey",
      lastPosition: 5400
    }
  ];
  
  // Recent books (books with progress > 0 but < 1)
  const recentBooks = books.filter(book => book.progress > 0 && book.progress < 1);
  
  return { books, recentBooks };
};
