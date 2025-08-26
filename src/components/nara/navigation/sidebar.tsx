import React from "react";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

export type NavigationPage = "home" | "library" | "bookmarks" | "history" | "settings";

interface SidebarProps {
  currentPage: NavigationPage;
  onPageChange: (page: NavigationPage) => void;
}

const navigationItems = [
  {
    id: "home" as NavigationPage,
    label: "Home",
    icon: "lucide:home",
  },
  {
    id: "library" as NavigationPage,
    label: "My Library", 
    icon: "lucide:library",
  },
  {
    id: "bookmarks" as NavigationPage,
    label: "Bookmarks",
    icon: "lucide:bookmark",
  },
  {
    id: "history" as NavigationPage,
    label: "History",
    icon: "lucide:history",
  },
  {
    id: "settings" as NavigationPage,
    label: "Settings",
    icon: "lucide:settings",
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  return (
    <div className="w-80 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Nara
          </h1>
          <ThemeToggle />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = currentPage === item.id;
          
          return (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant={isActive ? "flat" : "ghost"}
                className={`
                  w-full justify-start h-12 text-left font-medium
                  ${isActive 
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }
                `}
                startContent={
                  <Icon 
                    icon={item.icon} 
                    className={`w-5 h-5 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} 
                  />
                }
                onPress={() => onPageChange(item.id)}
              >
                {item.label}
              </Button>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Powered by AI
        </div>
      </div>
    </div>
  );
};