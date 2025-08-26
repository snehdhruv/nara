import { mutation } from "./_generated/server";

export const fixAllYouTubeFlags = mutation({
  args: {},
  handler: async (ctx) => {
    const audiobooks = await ctx.db.query("audiobooks").collect();
    
    let fixedCount = 0;
    const fixedBooks: string[] = [];
    
    for (const book of audiobooks) {
      // If book has a YouTube ID but isYouTube is false, fix it
      if (book.youtubeVideoId && !book.isYouTube) {
        await ctx.db.patch(book._id, { isYouTube: true });
        fixedBooks.push(book.title);
        fixedCount++;
      }
    }
    
    return {
      success: true,
      fixedCount,
      fixedBooks,
      message: `Fixed ${fixedCount} books to have isYouTube: true`
    };
  },
});