#!/usr/bin/env node

// Test script to add 10 YC-relevant audiobooks to the system
const books = [
  {
    videoId: "UF8uR6Z6KLc",
    title: "The Lean Startup",
    author: "Eric Ries",
    description: "How Today's Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses"
  },
  {
    videoId: "CnJdOb7eFY0",
    title: "The Mom Test",
    author: "Rob Fitzpatrick", 
    description: "How to Talk to Customers and Learn if Your Business is a Good Idea"
  },
  {
    videoId: "Th8JoIan4dg",
    title: "Crossing the Chasm",
    author: "Geoffrey Moore",
    description: "Marketing and Selling High-Tech Products to Mainstream Customers"
  },
  {
    videoId: "8fQ_f6uzfGs",
    title: "The Hard Thing About Hard Things",
    author: "Ben Horowitz",
    description: "Building a Business When There Are No Easy Answers"
  },
  {
    videoId: "RmxiKeg4Qoc",
    title: "Venture Deals",
    author: "Brad Feld & Jason Mendelson",
    description: "Be Smarter Than Your Lawyer and Venture Capitalist"
  },
  {
    videoId: "W25_jgiY_VY",
    title: "Blitzscaling",
    author: "Reid Hoffman",
    description: "The Lightning-Fast Path to Building Massively Valuable Companies"
  },
  {
    videoId: "8ti-dOuKiBs",
    title: "The Innovator's Dilemma",
    author: "Clayton Christensen",
    description: "When New Technologies Cause Great Firms to Fail"
  },
  {
    videoId: "rn_p8wpUIJA",
    title: "Founders at Work",
    author: "Jessica Livingston",
    description: "Stories of Startups' Early Days"
  },
  {
    videoId: "QPBgJ-8o4Tg",
    title: "The Everything Store",
    author: "Brad Stone",
    description: "Jeff Bezos and the Age of Amazon"
  },
  {
    videoId: "7wKF73kCaB8",
    title: "Hooked",
    author: "Nir Eyal",
    description: "How to Build Habit-Forming Products"
  }
];

async function testBook(book) {
  console.log(`\n🔄 Testing: ${book.title} by ${book.author}`);
  console.log(`   Video ID: ${book.videoId}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/youtube/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: book.videoId,
        title: book.title,
        author: book.author,
        narrator: book.author,
        description: book.description
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`   ✅ Successfully processed: ${book.title}`);
      console.log(`   Duration: ${Math.round(data.audiobook.duration / 60)} minutes`);
      console.log(`   Chapters: ${data.audiobook.chapters.length}`);
      return { success: true, book: data.audiobook };
    } else {
      console.log(`   ❌ Failed to process: ${data.error}`);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.log(`   ❌ Network/API error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Testing YouTube Audiobook Processing with YC-relevant books...\n');
  
  const results = [];
  const successfulBooks = [];
  
  // Test books one by one to avoid overwhelming the system
  for (const book of books) {
    const result = await testBook(book);
    results.push({ ...book, result });
    
    if (result.success) {
      successfulBooks.push(result.book);
    }
    
    // Wait 2 seconds between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 Final Results:');
  console.log(`✅ Successfully processed: ${successfulBooks.length}/${books.length} books`);
  console.log(`❌ Failed: ${books.length - successfulBooks.length} books\n`);
  
  if (successfulBooks.length > 0) {
    console.log('📚 Successfully processed books:');
    successfulBooks.forEach(book => {
      console.log(`   • ${book.title} by ${book.author} (${Math.round(book.duration / 60)}min)`);
    });
  }
  
  const failedBooks = results.filter(r => !r.result.success);
  if (failedBooks.length > 0) {
    console.log('\n❌ Failed books:');
    failedBooks.forEach(book => {
      console.log(`   • ${book.title}: ${book.result.error}`);
    });
  }
  
  console.log('\n🔗 Now check http://localhost:3000/nara to see the books in the dashboard!');
}

main().catch(console.error);