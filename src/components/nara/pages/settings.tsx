import React from "react";
import { Button, Switch, Select, SelectItem, Slider, Card, CardBody, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [autoplay, setAutoplay] = React.useState(true);
  const [skipSilence, setSkipSilence] = React.useState(false);
  const [autoBookmark, setAutoBookmark] = React.useState(true);
  const [voiceSpeed, setVoiceSpeed] = React.useState([1.0]);
  const [audioQuality, setAudioQuality] = React.useState("high");
  const [notifications, setNotifications] = React.useState(true);
  const [voiceResponses, setVoiceResponses] = React.useState(true);
  const [keyboardShortcuts, setKeyboardShortcuts] = React.useState(true);

  const handleResetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      setAutoplay(true);
      setSkipSilence(false);
      setAutoBookmark(true);
      setVoiceSpeed([1.0]);
      setAudioQuality("high");
      setNotifications(true);
      setVoiceResponses(true);
      setKeyboardShortcuts(true);
      setTheme("system");
    }
  };

  const handleExportData = () => {
    // In a real app, this would export user data
    alert("Data export feature coming soon!");
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all your data? This cannot be undone.")) {
      // In a real app, this would clear user data
      alert("Data clearing feature coming soon!");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Customize your audiobook listening experience
        </p>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        
        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Icon icon="lucide:palette" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Appearance
                </h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Theme
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Choose your preferred color scheme
                    </p>
                  </div>
                  <Select
                    size="sm"
                    selectedKeys={[theme || "system"]}
                    onSelectionChange={(keys) => setTheme(Array.from(keys)[0] as string)}
                    className="w-32"
                    variant="bordered"
                  >
                    <SelectItem key="light">Light</SelectItem>
                    <SelectItem key="dark">Dark</SelectItem>
                    <SelectItem key="system">System</SelectItem>
                  </Select>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Playback */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Icon icon="lucide:play" className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Playback
                </h2>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Autoplay next chapter
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Automatically continue to the next chapter
                    </p>
                  </div>
                  <Switch 
                    isSelected={autoplay} 
                    onValueChange={setAutoplay}
                    color="primary"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Skip silence
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Automatically skip long pauses
                    </p>
                  </div>
                  <Switch 
                    isSelected={skipSilence} 
                    onValueChange={setSkipSilence}
                    color="primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Voice response speed
                    </label>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {voiceSpeed[0]}x
                    </span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.25}
                    maxValue={3}
                    minValue={0.5}
                    value={voiceSpeed}
                    onChange={(value) => setVoiceSpeed(value as number[])}
                    className="max-w-md"
                    color="primary"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Audio quality
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Higher quality uses more data
                    </p>
                  </div>
                  <Select
                    size="sm"
                    selectedKeys={[audioQuality]}
                    onSelectionChange={(keys) => setAudioQuality(Array.from(keys)[0] as string)}
                    className="w-32"
                    variant="bordered"
                  >
                    <SelectItem key="low">Low</SelectItem>
                    <SelectItem key="medium">Medium</SelectItem>
                    <SelectItem key="high">High</SelectItem>
                  </Select>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* AI & Voice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Icon icon="lucide:mic" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  AI & Voice
                </h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Voice responses
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Enable AI to respond with voice
                    </p>
                  </div>
                  <Switch 
                    isSelected={voiceResponses} 
                    onValueChange={setVoiceResponses}
                    color="primary"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Auto-generate notes
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Automatically create notes from voice interactions
                    </p>
                  </div>
                  <Switch 
                    isSelected={autoBookmark} 
                    onValueChange={setAutoBookmark}
                    color="primary"
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Accessibility */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Icon icon="lucide:accessibility" className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Accessibility & Controls
                </h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Keyboard shortcuts
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Enable keyboard controls for playback
                    </p>
                  </div>
                  <Switch 
                    isSelected={keyboardShortcuts} 
                    onValueChange={setKeyboardShortcuts}
                    color="primary"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      Push notifications
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Get notified about updates and recommendations
                    </p>
                  </div>
                  <Switch 
                    isSelected={notifications} 
                    onValueChange={setNotifications}
                    color="primary"
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardBody className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Icon icon="lucide:shield" className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Data & Privacy
                </h2>
              </div>
              
              <div className="space-y-4">
                <Button
                  variant="bordered"
                  startContent={<Icon icon="lucide:download" className="w-4 h-4" />}
                  onPress={handleExportData}
                  className="w-full justify-start"
                >
                  Export my data
                </Button>
                
                <Button
                  color="danger"
                  variant="bordered"
                  startContent={<Icon icon="lucide:trash-2" className="w-4 h-4" />}
                  onPress={handleClearData}
                  className="w-full justify-start"
                >
                  Clear all data
                </Button>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-end gap-3 pt-4"
        >
          <Button
            variant="bordered"
            onPress={handleResetSettings}
            startContent={<Icon icon="lucide:rotate-ccw" className="w-4 h-4" />}
          >
            Reset to defaults
          </Button>
        </motion.div>
      </div>
    </div>
  );
};