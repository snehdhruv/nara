"use client";

import React from "react";
import { Button, Input, Card, CardBody, Spinner } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";

interface YouTubeVideo {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnailUrl: string;
  description?: string;
  hasClosedCaptions?: boolean;
  publishedAt?: string;
  viewCount?: string;
}

interface YouTubeSearchProps {
  onVideoSelect: (videoId: string, metadata: any) => void;
  onCancel: () => void;
}

export const YouTubeSearch: React.FC<YouTubeSearchProps> = ({ 
  onVideoSelect, 
  onCancel 
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState<string | null>(null);
  
  // Real YouTube search powered by API

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    try {
      console.log('[YouTube Search] Searching for:', searchQuery);
      
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}&maxResults=10`);
      const data = await response.json();
      
      if (data.success) {
        console.log('[YouTube Search] Found results:', data.results.length);
        setSearchResults(data.results);
      } else {
        console.error('[YouTube Search] Search failed:', data.error);
        setSearchResults([]);
        alert('Search failed: ' + data.error);
      }
    } catch (error) {
      console.error('[YouTube Search] Search error:', error);
      setSearchResults([]);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleVideoSelect = async (video: YouTubeVideo) => {
    setIsProcessing(video.videoId);
    
    try {
      // Process the video to extract transcript and metadata
      const response = await fetch('/api/youtube/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: video.videoId,
          title: video.title,
          channel: video.channel
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('[YouTube Search] Video processed successfully:', data.audiobook);
        onVideoSelect(video.videoId, data.audiobook);
      } else {
        throw new Error(data.error || 'Failed to process video');
      }
    } catch (error) {
      console.error('[YouTube Search] Failed to process video:', error);
      alert('Failed to process video. Please try another one.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f6f2] p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-[#5d534f] mb-2">
              Add YouTube Audiobook
            </h1>
            <p className="text-[#8a817c]">
              Search for audiobooks on YouTube to add to your library
            </p>
          </div>
          <Button
            variant="light"
            onPress={onCancel}
            startContent={<Icon icon="lucide:x" width={16} />}
            className="text-[#8a817c]"
          >
            Cancel
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex gap-3">
            <Input
              placeholder="Search for audiobooks on YouTube..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              startContent={<Icon icon="lucide:search" className="text-[#8a817c]" width={18} />}
              classNames={{
                base: "flex-1",
                inputWrapper: "bg-white border-[#d4b9a8] hover:border-[#8B7355]"
              }}
            />
            <Button
              onPress={handleSearch}
              isLoading={isSearching}
              color="primary"
              className="bg-[#8B7355] hover:bg-[#7A6348] px-6"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-[#5d534f] mb-4">
              Search Results ({searchResults.length})
            </h2>
            
            {searchResults.map((video) => (
              <motion.div
                key={video.videoId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border border-[#d4b9a8] overflow-hidden"
              >
                <Card className="shadow-none border-none">
                  <CardBody className="p-0">
                    <div className="flex gap-4 p-6">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-40 h-24 object-cover rounded-md"
                        />
                        <div className="text-xs text-center mt-1 text-[#8a817c]">
                          {video.duration}
                        </div>
                      </div>
                      
                      {/* Video Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-[#5d534f] mb-2 line-clamp-2">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm text-[#8a817c]">
                            {video.channel}
                          </p>
                          {video.hasClosedCaptions && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                              <Icon icon="lucide:closed-captioning" width={12} />
                              CC
                            </span>
                          )}
                        </div>
                        {video.description && (
                          <p className="text-sm text-[#8a817c] line-clamp-2">
                            {video.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex-shrink-0 flex items-center">
                        <Button
                          onPress={() => handleVideoSelect(video)}
                          isLoading={isProcessing === video.videoId}
                          isDisabled={!!isProcessing}
                          color="primary"
                          className="bg-[#8B7355] hover:bg-[#7A6348]"
                          startContent={
                            !isProcessing ? (
                              <Icon icon="lucide:plus" width={16} />
                            ) : undefined
                          }
                        >
                          {isProcessing === video.videoId ? 'Processing...' : 'Add to Library'}
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isSearching && searchResults.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <Icon icon="lucide:search-x" className="mx-auto mb-4 text-[#8a817c]" width={48} />
            <p className="text-[#8a817c]">
              No audiobooks found. Try a different search term.
            </p>
          </div>
        )}

        {/* Initial State */}
        {!searchQuery && searchResults.length === 0 && (
          <div className="text-center py-12">
            <Icon icon="lucide:youtube" className="mx-auto mb-4 text-[#8a817c]" width={48} />
            <p className="text-[#8a817c] mb-4">
              Search YouTube for audiobooks to add to your library
            </p>
            <p className="text-sm text-[#8a817c]">
              Try searching for popular business books, self-help audiobooks, or educational content
            </p>
          </div>
        )}
      </div>
    </div>
  );
};