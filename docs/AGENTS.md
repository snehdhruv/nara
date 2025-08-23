# AI Audiobook Copilot - LangGraph Agent Specification

## Node I/O Contracts

### ProgressGate
**Input**: `userId`, `audiobookId`, `question`
**Output**: `allowedChapterIdx`, `isSpoilerQuery` (internal)
**Logic**: Read userProgress.currentIdx; cap allowed chapter to current

### ChapterLoader
**Input**: `audiobookId`, `allowedChapterIdx`
**Output**: `chapterTranscript` (text | segments), `priorSummaries` (optional)
**Logic**: Load transcript for active chapter + optional short summaries from previous chapters

### BudgetPlanner
**Input**: `chapterTranscript`, `question`
**Output**: `mode` ("full" | "compressed" | "focused")
**Logic**: Estimate token count; choose mode based on Claude context limits

### FocusedSelector
**Input**: `chapterTranscript`, `question`, `mode: "focused"`
**Output**: `selectedSegments` (paragraphs + neighbors)
**Logic**: Keyword matching + context window around relevant paragraphs

### Compressor
**Input**: `chapterTranscript`, `question`, `mode: "compressed"`
**Output**: `compressedText`
**Logic**: Summarize while preserving key entities, events, and temporal relationships

### ContextPacker
**Input**: `selectedContent`, `question`, `allowedChapterIdx`
**Output**: `claudeMessages`, `systemPrompt`
**Logic**: Build spoiler-safe system prompt + user/assistant messages with chosen content

### Answerer
**Input**: `claudeMessages`, `systemPrompt`
**Output**: `answerText`, `paragraphRefs` (optional), `timestampRefs` (optional)
**Logic**: Call Claude 4.1 with safety margins; return text with optional references

### PostProcess
**Input**: `answerText`, `paragraphRefs`, `timestampRefs`, `chapterData`
**Output**: `finalAnswer`, `playbackHints` (chapterUri, offsetMs)
**Logic**: Format answer + attach playback hints for UI highlighting/seeking

## Silent Spoiler Handling

- **No User-Visible Refusals**: All answers are context-limited
- **Progressive Context Reduction**: If query targets future content, reduce context scope
- **Fallback Responses**: Generic answers when no safe context available
- **Internal Logging Only**: Spoiler attempts logged for analytics but not shown to user

## Execution Modes

1. **Full Chapter**: Use complete transcript within token limits
2. **Compressed**: Summarize chapter while preserving key information
3. **Focused**: Extract relevant paragraphs + small context window
4. **Minimal**: Generic response when insufficient safe context

## Error Handling

- **Graceful Degradation**: Fall back to simpler modes on token overflow
- **Network Resilience**: Retry logic for Claude/ElevenLabs calls
- **Data Fallbacks**: Use cached summaries when transcripts unavailable
- **Silent Failures**: No error messages; provide generic responses
