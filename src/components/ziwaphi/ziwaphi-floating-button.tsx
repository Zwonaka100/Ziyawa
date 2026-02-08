'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, MessageCircle, Sparkles } from 'lucide-react';
import { ZiwaphiChat } from './ziwaphi-chat';
import { cn } from '@/lib/utils';

export function ZiwaphiFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  // Stop pulsing after first open
  useEffect(() => {
    if (isOpen) {
      setShowPulse(false);
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg',
          'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70',
          'transition-all duration-300',
          isOpen && 'scale-0 opacity-0',
          showPulse && 'animate-pulse'
        )}
        size="icon"
      >
        <div className="relative">
          <MessageCircle className="h-6 w-6" />
          <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-300" />
        </div>
      </Button>

      {/* Chat Window */}
      <div
        className={cn(
          'fixed bottom-4 right-4 z-50 w-[95vw] max-w-[400px]',
          'transition-all duration-300 origin-bottom-right',
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        )}
      >
        <Card className="shadow-2xl overflow-hidden">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Chat component */}
          <ZiwaphiChat />
        </Card>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
