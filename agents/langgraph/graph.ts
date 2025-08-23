import { StateGraph, END } from '@langchain/langgraph';
import { GraphState, GraphInput } from './types';
import { progressGateNode } from './nodes/progressGate';
import { chapterLoaderNode } from './nodes/chapterLoader';
import { budgetPlannerNode } from './nodes/budgetPlanner';
import { focusedSelectorNode } from './nodes/focusedSelector';
import { compressorNode } from './nodes/compressor';
import { contextPackerNode } from './nodes/contextPacker';
import { answererNode } from './nodes/answerer';
import { postProcessNode } from './nodes/postProcess';
import { noteTakerNode } from './nodes/noteTaker';

// Create the graph
const workflow = new StateGraph<GraphState>({
  channels: GraphState.shape
});

// Add nodes
workflow.addNode('progressGate', progressGateNode);
workflow.addNode('chapterLoader', chapterLoaderNode);
workflow.addNode('budgetPlanner', budgetPlannerNode);
workflow.addNode('focusedSelector', focusedSelectorNode);
workflow.addNode('compressor', compressorNode);
workflow.addNode('contextPacker', contextPackerNode);
workflow.addNode('answerer', answererNode);
workflow.addNode('postProcess', postProcessNode);

// Add edges
workflow.addEdge('progressGate', 'chapterLoader');
workflow.addEdge('chapterLoader', 'budgetPlanner');

// Conditional routing based on packing mode
workflow.addConditionalEdges(
  'budgetPlanner',
  (state) => {
    if (state.packingMode === 'focused') {
      return 'focusedSelector';
    } else if (state.packingMode === 'compressed') {
      return 'compressor';
    } else {
      return 'contextPacker';
    }
  },
  {
    focusedSelector: 'focusedSelector',
    compressor: 'compressor',
    contextPacker: 'contextPacker'
  }
);

workflow.addEdge('focusedSelector', 'contextPacker');
workflow.addEdge('compressor', 'contextPacker');
workflow.addEdge('contextPacker', 'answerer');
workflow.addEdge('answerer', 'postProcess');
workflow.addEdge('postProcess', END);

// Set entry point
workflow.setEntryPoint('progressGate');

// Compile the graph
const compiledGraph = workflow.compile();

// Export main functions
export async function runChapterQA(input: GraphInput): Promise<{
  answer_markdown: string;
  citations: Array<{ type: 'para' | 'time'; ref: string }>;
  playbackHint: { chapter_idx: number; start_s: number };
}> {
  console.log('=== Starting Chapter QA ===');
  console.log('Question:', input.question);
  console.log('Chapter:', input.playbackChapterIdx);
  
  // Validate input
  const validatedInput = GraphInput.parse(input);
  
  // Run the graph
  const result = await compiledGraph.invoke(validatedInput);
  
  console.log('=== Completed Chapter QA ===');
  
  if (!result.answer || !result.playbackHint) {
    throw new Error('Failed to generate answer');
  }
  
  return {
    answer_markdown: result.answer.markdown,
    citations: result.answer.citations,
    playbackHint: result.playbackHint
  };
}

export async function runNotes(params: { transcript: string }): Promise<string> {
  console.log('=== Generating Notes ===');
  const notes = await noteTakerNode(params);
  console.log('=== Notes Generated ===');
  return notes;
}