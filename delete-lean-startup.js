#!/usr/bin/env node

const fetch = require('node-fetch');

async function deleteLeanStartup() {
  try {
    // Get all books to find the problematic Lean Startup ID
    const response = await fetch('http://localhost:3000/api/books');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to get books: ' + data.error);
    }
    
    console.log('Found books:');
    data.books.forEach(book => {
      console.log(`- ${book.title} (${book.id}) - Video: ${book.youtubeVideoId} - Duration: ${book.duration}`);
    });
    
    // Find the Lean Startup with duplicate Zero to One content
    const leanStartupBook = data.books.find(book => 
      book.title.includes('Lean Startup') && book.duration === 16982
    );
    
    if (leanStartupBook) {
      console.log(`\nFound problematic Lean Startup: ${leanStartupBook.id}`);
      console.log(`Duration: ${leanStartupBook.duration} (should not match Zero to One's 16982)`);
      console.log(`Video ID: ${leanStartupBook.youtubeVideoId}`);
      console.log('\nDeleting this entry...');
      
      // Use the Convex API to delete via the save-to-convex route with a deletion flag
      const deleteResponse = await fetch('http://localhost:3000/api/youtube/save-to-convex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          videoId: leanStartupBook.youtubeVideoId,
          audiobookId: leanStartupBook.id
        }),
      });
      
      const deleteResult = await deleteResponse.json();
      console.log('Delete result:', deleteResult);
    } else {
      console.log('\nNo problematic Lean Startup found.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteLeanStartup();