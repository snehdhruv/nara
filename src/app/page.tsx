"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [paintSplashes, setPaintSplashes] = useState<Array<{ id: number; x: number; y: number; color: string; size: number }>>([]);
  const [showSecondaryText, setShowSecondaryText] = useState(false);
  const [drips, setDrips] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastInteraction, setLastInteraction] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  
  // Check authentication status
  const { data: session } = authClient.useSession();
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    // Show secondary text after a delay
    const timer = setTimeout(() => setShowSecondaryText(true), 2000);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  const createPaintSplash = (e: React.MouseEvent) => {
    const now = Date.now();
    const timeSinceLastInteraction = now - lastInteraction;
    setLastInteraction(now);

    const colors = [
      '#C41E3A', // Cardinal red
      '#FF6B35', // Vermillion
      '#2E8B57', // Sea green
      '#4169E1', // Royal blue
      '#DAA520', // Goldenrod
      '#8B4513', // Saddle brown
      '#483D8B', // Dark slate blue
      '#B22222', // Fire brick
    ];
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Create main splash
    const splash = {
      id: now + Math.random(),
      x: clickX,
      y: clickY,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 60 + 20
    };
    
    setPaintSplashes(prev => [...prev, splash]);
    
    // Create Pollock-style drips if user is clicking rapidly
    if (timeSinceLastInteraction < 500) {
      const dripCount = Math.floor(Math.random() * 4) + 2;
      const newDrips = Array.from({ length: dripCount }, (_, i) => ({
        id: now + Math.random() + i,
        x: clickX + (Math.random() - 0.5) * 100,
        y: clickY,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: i * 100
      }));
      
      setDrips(prev => [...prev, ...newDrips]);
      
      // Remove drips after animation
      setTimeout(() => {
        setDrips(prev => prev.filter(d => !newDrips.some(nd => nd.id === d.id)));
      }, 4000);
    }
    
    // Remove splash after animation
    setTimeout(() => {
      setPaintSplashes(prev => prev.filter(s => s.id !== splash.id));
    }, 3000);
  };

  const handleEnterExperience = async () => {
    setIsCheckingAuth(true);
    
    try {
      if (session) {
        // User is already authenticated, go directly to the app
        router.push('/nara');
      } else {
        // Redirect to Spotify OAuth
        router.push('/nara');
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      // Fallback to sign-in page if social auth fails
      router.push('/auth/sign-in');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen bg-background overflow-hidden cursor-none"
      onClick={createPaintSplash}
    >
      {/* Dynamic paint splashes */}
      <AnimatePresence>
        {paintSplashes.map(splash => (
          <motion.div
            key={splash.id}
            className="absolute pointer-events-none paint-splash"
            style={{
              left: splash.x,
              top: splash.y,
              width: splash.size,
              height: splash.size,
              backgroundColor: splash.color,
            }}
            initial={{ 
              scale: 0, 
              opacity: 0.9,
              borderRadius: "50%"
            }}
            animate={{ 
              scale: [0, 1.2, 1],
              opacity: [0.9, 0.7, 0],
              borderRadius: ["50%", "60% 40% 65% 35%", "40% 60% 35% 65%"],
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              duration: 3,
              ease: "easeOut"
            }}
          />
        ))}
      </AnimatePresence>

      {/* Pollock-style paint drips */}
      <AnimatePresence>
        {drips.map(drip => (
          <motion.div
            key={drip.id}
            className="absolute pointer-events-none"
            style={{
              left: drip.x,
              top: drip.y,
              width: 4 + Math.random() * 8,
              backgroundColor: drip.color,
            }}
            initial={{ 
              height: 0,
              opacity: 0.8
            }}
            animate={{ 
              height: 100 + Math.random() * 200,
              opacity: [0.8, 0.6, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              delay: drip.delay / 1000,
              duration: 2,
              ease: "easeOut"
            }}
          />
        ))}
      </AnimatePresence>

      {/* Custom cursor that follows mouse */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-50 w-6 h-6 border-2 border-foreground rounded-full mix-blend-difference"
        animate={{
          x: mousePosition.x - 12,
          y: mousePosition.y - 12,
          scale: isHovered ? 2 : 1,
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 400,
          mass: 0.5,
        }}
      />

      {/* Background texture overlay */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="w-full h-full bg-[radial-gradient(circle_at_25%_25%,_#000_1px,_transparent_1px),radial-gradient(circle_at_75%_75%,_#000_1px,_transparent_1px)] bg-[length:60px_60px]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        
        {/* Title with dramatic entrance */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="mb-8"
        >
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-clip-text text-transparent">
              NARA
            </span>
          </h1>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.8, duration: 1.5, ease: "easeInOut" }}
            className="h-1 bg-gradient-to-r from-transparent via-foreground to-transparent mx-auto"
          />
        </motion.div>

        {/* Subtitle with staggered animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="max-w-4xl mb-12"
        >
          <p className="text-xl md:text-2xl lg:text-3xl font-light leading-relaxed text-foreground/90">
            Break the fourth wall of knowledge.
          </p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={showSecondaryText ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-lg md:text-xl lg:text-2xl font-light mt-4 text-foreground/70"
          >
            Where audiobooks become conversations, and wisdom becomes transformation.
          </motion.p>
        </motion.div>

        {/* Interactive elements */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-6 items-center"
        >
          <motion.button
            className="group relative px-12 py-4 bg-foreground text-background font-medium text-lg rounded-none border-2 border-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: isCheckingAuth ? 1 : 1.05 }}
            whileTap={{ scale: isCheckingAuth ? 1 : 0.95 }}
            onHoverStart={() => !isCheckingAuth && setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={handleEnterExperience}
            disabled={isCheckingAuth}
          >
            <span className="relative z-10 flex items-center gap-2">
              {isCheckingAuth ? (
                <>
                  <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin" />
                  {session ? 'Entering...' : 'Connecting to Spotify...'}
                </>
              ) : (
                'Enter the Experience'
              )}
            </span>
            <motion.div
              className="absolute inset-0 bg-background"
              initial={{ scaleX: 0 }}
              whileHover={{ scaleX: isCheckingAuth ? 0 : 1 }}
              transition={{ duration: 0.3 }}
              style={{ originX: 0 }}
            />
            <motion.span
              className="absolute inset-0 flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ zIndex: 20 }}
            >
              {isCheckingAuth ? (
                <span className="flex items-center gap-2">
                  <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin" />
                  {session ? 'Entering...' : 'Connecting to Spotify...'}
                </span>
              ) : (
                'Enter the Experience'
              )}
            </motion.span>
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3, duration: 0.8 }}
            className="flex items-center gap-2 text-foreground/60"
          >
            <Icon icon="lucide:mouse-pointer-click" className="w-5 h-5" />
            <span className="text-sm">Click anywhere to paint your journey</span>
          </motion.div>
        </motion.div>

        {/* Floating elements inspired by Holy Mountain's surrealism */}
        <motion.div
          className="absolute top-20 left-20"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Icon icon="lucide:book-open" className="w-8 h-8 text-foreground/20" />
        </motion.div>

        <motion.div
          className="absolute bottom-32 right-16"
          animate={{
            y: [0, 15, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Icon icon="lucide:headphones" className="w-10 h-10 text-foreground/20" />
        </motion.div>

        <motion.div
          className="absolute top-1/3 right-1/4"
          animate={{
            x: [0, 10, 0],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Icon icon="lucide:brain" className="w-6 h-6 text-foreground/15" />
        </motion.div>
      </div>

      {/* Bottom philosophy text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4, duration: 2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center"
      >
        <p className="text-sm text-foreground/50 max-w-2xl">
          "The real voyage of discovery consists not in seeking new landscapes, but in having new eyes." 
          <br />
          <span className="text-xs opacity-70">— Marcel Proust</span>
        </p>
      </motion.div>

      {/* Side navigation hint */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 3.5, duration: 1 }}
        className="absolute left-8 top-1/2 transform -translate-y-1/2 writing-vertical-rl text-sm text-foreground/40 tracking-widest"
      >
        TRANSCEND • TRANSFORM • TRANSCRIBE
      </motion.div>
    </div>
  );
}
