import React from "react";
import { Book } from "@/types/nara/book";

// Sample book data
const sampleBook: Book = {
  id: "atomic-habits",
  title: "Atomic Habits",
  author: "James Clear",
  narrator: "James Clear",
  coverUrl: "https://img.heroui.chat/image/book?w=400&h=600&u=atomic-habits",
  duration: 318 * 60, // 5 hours 18 minutes in seconds
  currentChapter: 1,
  chapterTitle: "The Surprising Power of Atomic Habits",
  content: [
    {
      text: "THE SURPRISING POWER OF ATOMIC HABITS. My friend was doing everything right. He went to the gym three times per week. He ate healthy meals. He didn't smoke or drink excessively. But despite his efforts, he wasn't seeing results.",
      startTime: 0,
      endTime: 15
    },
    {
      text: `When he came to me for advice, I suggested that he change his lifestyle in a different way. "It's not about the occasional workout or healthy meal," I said. "It's about creating a system of small habits that you follow every single day."`,
      startTime: 15,
      endTime: 30
    },
    {
      text: "The 2-minute rule is simple: When you start a new habit, it should take less than two minutes to do. You'll find that nearly any habit can be scaled down into a two-minute version. Want to build the habit of reading books? Read just one page. Want to do yoga? Just get out your yoga mat.",
      startTime: 30,
      endTime: 45
    },
    {
      text: "The idea is to make your habits so easy that you'll do them even when you don't feel motivated. Once you've established the habit of showing up, you can improve your performance. The most effective form of motivation is progress.",
      startTime: 45,
      endTime: 60
    },
    {
      text: "Small habits don't seem to make much difference until you cross a critical threshold and unlock a new level of performance. In the early and middle stages of any quest, there is often a Valley of Disappointment where you expect to make progress in a linear fashion, but the results take longer than expected.",
      startTime: 60,
      endTime: 75
    },
    {
      text: `This is one of the core reasons why it's so hard to build habits that last. People make a few small changes, fail to see a tangible result, and decide to stop. You think, "I've been running every day for a month, so why can't I see any change in my body?"`,
      startTime: 75,
      endTime: 90
    },
    {
      text: "Once this kind of thinking takes over, it's easy to let good habits fall by the wayside. But in order to make a meaningful difference, habits need to persist long enough to break through this plateau—what I call the Plateau of Latent Potential.",
      startTime: 90,
      endTime: 105
    },
    {
      text: "If you find yourself struggling to build a good habit or break a bad one, it is not because you have lost your ability to improve. It is often because you have not yet crossed the Plateau of Latent Potential. Complaining about not achieving success despite working hard is like complaining about an ice cube not melting when you heated it from twenty-five to thirty-one degrees.",
      startTime: 105,
      endTime: 120
    },
    {
      text: "Your work was not wasted; it is just being stored. All the action happens at thirty-two degrees. When you finally break through the Plateau of Latent Potential, people will call it an overnight success. The outside world only sees the most dramatic event rather than all that preceded it.",
      startTime: 120,
      endTime: 135
    },
    {
      text: "But you know that it's the work you did long ago—when it seemed that you weren't making any progress—that makes the jump today possible. It is the human equivalent of geological pressure. Two tectonic plates can grind against one another for millions of years, the tension slowly building all the while, until one day there is an earthquake.",
      startTime: 135,
      endTime: 150
    }
  ]
};

export const useAudiobook = () => {
  const [currentBook] = React.useState<Book>(sampleBook);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentPosition, setCurrentPosition] = React.useState(30); // Start at the 2-minute rule paragraph
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1);
  
  // Simulate playback progress
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentPosition(prev => {
          const newPosition = prev + (playbackSpeed * 0.5);
          if (newPosition >= currentBook.duration) {
            setIsPlaying(false);
            return 0;
          }
          return newPosition;
        });
      }, 500);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentBook.duration, playbackSpeed]);
  
  const togglePlayback = () => {
    setIsPlaying(prev => !prev);
  };
  
  return {
    currentBook,
    isPlaying,
    currentPosition,
    togglePlayback,
    playbackSpeed,
    setPlaybackSpeed
  };
};
