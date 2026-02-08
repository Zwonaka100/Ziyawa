'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Send, 
  Bot, 
  User, 
  Calendar, 
  MapPin, 
  Clock,
  Ticket,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/helpers';
import { parseQuery, type ParsedQuery } from '@/lib/ziwaphi/query-parser';
import { 
  FAQ_DATABASE, 
  QUICK_ACTIONS, 
  getRandomGreeting,
  searchFAQ,
  type FAQItem 
} from '@/lib/ziwaphi/knowledge-base';

// =====================================================
// TYPES
// =====================================================

interface EventResult {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  province: string;
  image_url: string | null;
  min_price: number;
  max_price: number;
  is_free: boolean;
  category: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  events?: EventResult[];
  faq?: FAQItem;
  isTyping?: boolean;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function ZiwaphiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial greeting
  useEffect(() => {
    if (!hasGreeted) {
      const greeting = getRandomGreeting();
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
        },
      ]);
      setHasGreeted(true);
    }
  }, [hasGreeted]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending message
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      // Parse the query
      const parsed = parseQuery(trimmedInput);
      
      // Handle different intents
      let assistantMessage: Message;

      if (parsed.intent === 'greeting') {
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: "Hey! 👋 What would you like to do? You can ask me about events, how to use Ziyawa, or any questions you have!",
          timestamp: new Date(),
        };
      } else if (parsed.intent === 'faq') {
        const faq = parsed.faqId ? FAQ_DATABASE.find(f => f.id === parsed.faqId) : searchFAQ(trimmedInput);
        
        if (faq) {
          assistantMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            faq,
          };
        } else {
          assistantMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: "I'm not sure about that one. Here are some things I can help with:\n\n• Finding events\n• Buying tickets\n• Becoming an organizer, artist, or vendor\n• Payment and wallet questions\n\nOr you can [create a support ticket](/support) for more specific help! 💬",
            timestamp: new Date(),
          };
        }
      } else if (parsed.intent === 'search_events' || parsed.intent === 'unknown') {
        // Search for events
        const events = await searchEvents(parsed);
        
        if (events.length > 0) {
          const locationText = parsed.searchParams.location?.city || parsed.searchParams.location?.province || '';
          const dateText = parsed.searchParams.dateRange?.label || '';
          const categoryText = parsed.searchParams.category || '';
          
          const contextParts = [dateText, locationText, categoryText].filter(Boolean);
          const contextText = contextParts.length > 0 ? ` for ${contextParts.join(' in ')}` : '';
          
          assistantMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: `I found ${events.length} event${events.length > 1 ? 's' : ''}${contextText}! 🎉`,
            timestamp: new Date(),
            events,
          };
        } else {
          assistantMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: "I couldn't find any events matching that. Try:\n\n• \"Events this weekend in Joburg\"\n• \"Free events in Cape Town\"\n• \"Amapiano parties next month\"\n\nOr browse all events on the [homepage](/)! 🎵",
            timestamp: new Date(),
          };
        }
      } else {
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: "I'm here to help! You can:\n\n🎉 Ask about events: \"What's happening this weekend?\"\n🎫 Ask about tickets: \"How do I buy tickets?\"\n💬 Get support: \"How do I contact support?\"\n\nWhat would you like to know?",
          timestamp: new Date(),
        };
      }

      // Remove typing indicator and add response
      setMessages(prev => prev.filter(m => m.id !== 'typing').concat(assistantMessage));
    } catch (error) {
      console.error('Ziwaphi error:', error);
      setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "Oops! Something went wrong. Please try again or [contact support](/support). 🙏",
        timestamp: new Date(),
      }));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  // Handle quick action
  const handleQuickAction = useCallback((action: typeof QUICK_ACTIONS[0]) => {
    if (action.action === 'link' && action.href) {
      window.location.href = action.href;
      return;
    }
    
    if (action.query) {
      setInput(action.query);
      // Trigger send after a short delay
      setTimeout(() => {
        inputRef.current?.form?.requestSubmit();
      }, 100);
    }
  }, []);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh] bg-background rounded-lg border">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <Avatar className="h-10 w-10 bg-primary">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            Ziwaphi <Sparkles className="h-4 w-4 text-primary" />
          </h2>
          <p className="text-xs text-muted-foreground">Your event discovery assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* Quick actions (show only after greeting, before first user message) */}
        {messages.length === 1 && messages[0].role === 'assistant' && (
          <div className="flex flex-wrap gap-2 mt-4">
            {QUICK_ACTIONS.map(action => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="text-sm"
              >
                <span className="mr-1">{action.icon}</span>
                {action.label}
              </Button>
            ))}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="p-4 border-t"
      >
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about events or how to use Ziyawa..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

// =====================================================
// MESSAGE BUBBLE COMPONENT
// =====================================================

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (message.isTyping) {
    return (
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 bg-primary">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className={`h-8 w-8 ${isUser ? 'bg-muted' : 'bg-primary'}`}>
        <AvatarFallback className={isUser ? '' : 'bg-primary text-primary-foreground text-xs'}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Text content */}
        {message.content && (
          <div className={`rounded-lg px-4 py-2 ${
            isUser 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          }`}>
            <div className="text-sm whitespace-pre-wrap">
              <FormattedContent content={message.content} />
            </div>
          </div>
        )}

        {/* FAQ Response */}
        {message.faq && (
          <FAQResponse faq={message.faq} />
        )}

        {/* Event Results */}
        {message.events && message.events.length > 0 && (
          <div className="w-full space-y-2">
            {message.events.slice(0, 5).map(event => (
              <EventCard key={event.id} event={event} />
            ))}
            {message.events.length > 5 && (
              <Link href="/" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  View {message.events.length - 5} more events
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// FORMATTED CONTENT (handles markdown-like links)
// =====================================================

function FormattedContent({ content }: { content: string }) {
  // Simple markdown link parser
  const parts = content.split(/(\[.*?\]\(.*?\))/g);
  
  return (
    <>
      {parts.map((part, i) => {
        const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          return (
            <Link 
              key={i} 
              href={linkMatch[2]} 
              className="underline hover:text-primary-foreground/80"
            >
              {linkMatch[1]}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// =====================================================
// FAQ RESPONSE COMPONENT
// =====================================================

function FAQResponse({ faq }: { faq: FAQItem }) {
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm mb-2">{faq.question}</h4>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
          {faq.answer}
        </div>
        {faq.links && faq.links.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {faq.links.map((link, i) => (
              <Link key={i} href={link.href}>
                <Button variant="outline" size="sm">
                  {link.text}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================
// EVENT CARD COMPONENT
// =====================================================

function EventCard({ event }: { event: EventResult }) {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex">
          {/* Image */}
          <div className="w-24 h-24 flex-shrink-0 bg-muted">
            {event.image_url ? (
              <img
                src={event.image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                <Calendar className="h-8 w-8 text-primary/40" />
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="flex-1 p-3">
            <h4 className="font-semibold text-sm line-clamp-1">{event.title}</h4>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
              {event.time && (
                <>
                  <Clock className="h-3 w-3 ml-2" />
                  <span>{event.time}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{event.venue}, {event.city}</span>
            </div>

            <div className="flex items-center justify-between mt-2">
              {event.is_free ? (
                <Badge variant="secondary" className="text-xs">FREE</Badge>
              ) : (
                <span className="text-xs font-medium text-primary">
                  {event.min_price === event.max_price 
                    ? formatCurrency(event.min_price)
                    : `${formatCurrency(event.min_price)} - ${formatCurrency(event.max_price)}`
                  }
                </span>
              )}
              {event.category && (
                <Badge variant="outline" className="text-xs">{event.category}</Badge>
              )}
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}

// =====================================================
// EVENT SEARCH API CALL
// =====================================================

async function searchEvents(parsed: ParsedQuery): Promise<EventResult[]> {
  try {
    const params = new URLSearchParams();
    
    if (parsed.searchParams.dateRange) {
      params.set('startDate', parsed.searchParams.dateRange.start.toISOString());
      params.set('endDate', parsed.searchParams.dateRange.end.toISOString());
    }
    
    if (parsed.searchParams.location?.city) {
      params.set('city', parsed.searchParams.location.city);
    }
    
    if (parsed.searchParams.location?.province) {
      params.set('province', parsed.searchParams.location.province);
    }
    
    if (parsed.searchParams.category) {
      params.set('category', parsed.searchParams.category);
    }
    
    if (parsed.searchParams.priceRange?.isFree) {
      params.set('free', 'true');
    } else if (parsed.searchParams.priceRange?.max) {
      params.set('maxPrice', parsed.searchParams.priceRange.max.toString());
    }
    
    if (parsed.searchParams.searchText) {
      params.set('q', parsed.searchParams.searchText);
    }

    const response = await fetch(`/api/ziwaphi/search?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Search failed');
    }
    
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('Event search error:', error);
    return [];
  }
}
