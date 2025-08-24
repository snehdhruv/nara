"use node"
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";

export const streamingVoiceQA = action({
  args: {
    question: v.string(),
    audiobookId: v.id("audiobooks"),
    currentChapter: v.number(),
    currentPosition: v.number()
  },
  handler: async (ctx, { question, audiobookId, currentChapter, currentPosition }) => {
    // Get audiobook with chapter data
    const audiobook = await ctx.runQuery(api.audiobooks.getAudiobook, { audiobookId });
    if (!audiobook) {
      throw new Error("Audiobook not found");
    }

    // Find available chapters with segments
    const availableChapters = audiobook.chapters || [];
    const validChapter = Math.min(currentChapter, availableChapters.length);
    
    // Get current chapter content if available
    let chapterContent = "";
    let chapterTitle = "";
    if (audiobook.content && availableChapters.length > 0) {
      const targetChapter = availableChapters.find((ch: any) => ch.idx === validChapter);
      if (targetChapter) {
        chapterTitle = targetChapter.title;
        
        // Get content segments for this chapter
        const chapterSegments = audiobook.content.filter((segment: any) => 
          segment.startTime >= targetChapter.start_s && 
          segment.startTime < targetChapter.end_s
        );
        
        chapterContent = chapterSegments.map((s: any) => s.text).join(" ");
      }
    }

    // If no chapter content available, use audiobook description
    if (!chapterContent && audiobook.description) {
      chapterContent = audiobook.description;
    }

    // Create combined prompt for both answer and note generation
    const systemPrompt = `You are a knowledgeable AI assistant helping users understand audiobook content. 

Current audiobook: "${audiobook.title}" by ${audiobook.author}
Current chapter: "${chapterTitle}" (Chapter ${validChapter})
User's current position: ${Math.floor(currentPosition / 60)}:${String(Math.floor(currentPosition % 60)).padStart(2, '0')}

Based on the following content, answer the user's question AND generate a structured note.

Content:
${chapterContent}

Respond in the following JSON format:
{
  "answer": "Your detailed answer to the user's question",
  "note_title": "A concise title summarizing the key topic discussed",
  "note_bullets": ["Actionable takeaway 1", "Actionable takeaway 2", "Actionable takeaway 3"]
}

Keep the answer conversational and the note bullets focused on actionable insights (maximum 3 bullets).`;

    // Use Dedalus API router for Anthropic calls (same as LangGraph implementation)
    const dedalusApiKey = "dsk_live_968bad6d8869_2c6a10bbf70e4ca60663952a2db82356";
    if (!dedalusApiKey) {
      throw new Error("DEDALUS_API_KEY is required");
    }

    const response = await fetch("https://api.dedaluslabs.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${dedalusApiKey}`
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-5-sonnet-20241022", // Use Sonnet for better structured output
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        max_tokens: 1500,
        temperature: 0.6
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dedalus API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    
    let parsedResult: any = null;
    
    // Extract content from Dedalus response
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content;
      
      try {
        parsedResult = JSON.parse(content);
      } catch (e) {
        // If JSON parsing fails, create a fallback structure
        parsedResult = {
          answer: content,
          note_title: "Voice Discussion",
          note_bullets: ["Review the key points discussed", "Apply insights to your situation", "Continue listening for more details"]
        };
      }
    } else {
      throw new Error('Unexpected response format from Dedalus');
    }

    return {
      success: true,
      answer: parsedResult.answer,
      note: {
        title: parsedResult.note_title,
        bulletPoints: parsedResult.note_bullets
      },
      playbackHint: {
        chapter_idx: validChapter,
        start_s: currentPosition
      }
    };
  }
});

export const cacheTranscriptData = action({
  args: {
    audiobookId: v.id("audiobooks")
  },
  handler: async (ctx, { audiobookId }) => {
    // Get audiobook and check if transcript is already cached
    const audiobook = await ctx.runQuery(api.audiobooks.getAudiobook, { audiobookId });
    if (!audiobook) {
      throw new Error("Audiobook not found");
    }

    // Check if we already have processed transcript data
    if (audiobook.content && audiobook.chapters && audiobook.chapters.length > 0) {
      return { cached: true, message: "Transcript already cached" };
    }

    // This would process and cache the transcript data
    // For now, return success - this can be expanded later
    return { cached: false, message: "Transcript caching not yet implemented" };
  }
});