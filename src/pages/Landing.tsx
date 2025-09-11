import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from "react-helmet";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, MessageCircle, Share2, ArrowRight, Sparkles, Twitter, Github, Linkedin, Megaphone, type LucideIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QUOTES } from '@/utils/quotes';

// --- SEO + Scroll Animation Hooks ---
const useScrollReveal = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const elements = containerRef.current?.querySelectorAll<HTMLElement>('.reveal');
    if (!elements || elements.length === 0) return;
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('in-view');
        });
      },
      { threshold: 0.15 }
    );
    elements.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
  return containerRef;
};

// --- Typewriter Quotes --- //
const Typewriter: React.FC = () => {
  const [qIndex, setQIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [qChars, setQChars] = useState(0);
  const [aChars, setAChars] = useState(0);
  const [phase, setPhase] = useState<"typing" | "waiting" | "fading">("typing");

  const quote = useMemo(() => QUOTES[qIndex], [qIndex]);

  // Reset when switching to a new quote
  useEffect(() => {
    setQChars(0);
    setAChars(0);
    setPhase("typing");
  }, [qIndex]);

  // Typing effect
  useEffect(() => {
    if (phase !== "typing") return;
    const interval = setInterval(() => {
      setQChars(prev => (prev < quote.q.length ? prev + 1 : prev));
      setAChars(prev => (prev < quote.a.length ? prev + 1 : prev));
    }, 40);

    return () => clearInterval(interval);
  }, [phase, quote]);

  // When typing finishes → wait → fade → switch
  useEffect(() => {
    if (phase === "typing" && qChars >= quote.q.length && aChars >= quote.a.length) {
      setPhase("waiting");
      const timer = setTimeout(() => setPhase("fading"), 2500); // wait before fade
      return () => clearTimeout(timer);
    }

    if (phase === "fading") {
      const timer = setTimeout(() => {
        let next = Math.floor(Math.random() * QUOTES.length);
        if (next === qIndex && QUOTES.length > 1) {
          next = (next + 1) % QUOTES.length;
        }
        setQIndex(next);
      }, 700); // fade duration
      return () => clearTimeout(timer);
    }
  }, [phase, qChars, aChars, qIndex, quote]);

  return (
    <div
      className={`relative mx-auto max-w-3xl transition-opacity duration-700 ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      }`}
    >
      <p className="text-2xl md:text-3xl font-semibold leading-relaxed">
        <span className="whitespace-pre-wrap">{quote.q.slice(0, qChars)}</span>
        {phase === "typing" && (
          <span className="inline-block w-[10px] h-6 md:h-7 align-bottom bg-foreground/80 ml-0.5 animate-pulse rounded-sm" />
        )}
      </p>
      <p className="mt-3 text-lg md:text-xl text-muted-foreground">
        — <span className="whitespace-pre-wrap">{quote.a.slice(0, aChars)}</span>
      </p>
    </div>
  );
};



  

// Floating icons
const FloatingIcon: React.FC<{ Icon: LucideIcon; className?: string }> = ({ Icon, className }) => (
  <div className={`absolute opacity-20 animate-[float_8s_ease-in-out_infinite] ${className || ''}`}>
    <Icon className="h-8 w-8" />
  </div>
);

interface AppUpdate { id: string; version: string; title: string; content: string; created_at: string; badge_label?: string | null; badge_variant?: 'default' | 'secondary' | 'destructive' | 'outline' | null; }

const Landing = () => {
  const containerRef = useScrollReveal();
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('app_updates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      if (data) setUpdates(data as AppUpdate[]);
    };
    load();
  }, []);
  return (
    <>
      {/* SEO Helmet */}
      <Helmet>
        <title>MeetMate – Connect & Chat with Friends Instantly</title>
        <meta name="description" content="MeetMate lets you instantly connect and chat with friends anywhere in the world. Fun, colorful, and free forever." />
        <meta name="keywords" content="meetmate, connect with friends, chat app, global messaging, voice chat, schedule hangouts" />

        {/* Open Graph */}
        <meta property="og:title" content="MeetMate – Connect Instantly with Friends" />
        <meta property="og:description" content="Click, connect, and chat with your friends across countries in real-time." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MeetMate – Connect Instantly with Friends" />
        <meta name="twitter:description" content="MeetMate is like Discord, but simpler. Instantly chat and meet your friends worldwide." />
        <meta name="twitter:image" content="/og-image.png" />
      </Helmet>

      <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-glow overflow-hidden">
                <img src="/icon.png" alt="MeetMate Logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                MeetMate
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/updates" className="hidden sm:block">
                <Button variant="ghost" className="bg-background/60 backdrop-blur-sm h-10">
                  <Megaphone className="h-4 w-4 mr-2" /> What's New
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" className="bg-background/80 backdrop-blur-sm">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-12">
          <div className="text-center space-y-10 max-w-5xl mx-auto relative">
            <FloatingIcon Icon={Sparkles} className="left-6 top-4 text-primary" />
            <FloatingIcon Icon={Calendar} className="right-10 top-16 text-accent" />
            <FloatingIcon Icon={Clock} className="left-10 bottom-10 text-emerald-500" />

            <div className="space-y-8 reveal translate-y-6 opacity-0 transition-all duration-700">
              <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent leading-tight">
                Connect Instantly,
                <br />
                Chat Freely
              </h2>
              <Typewriter />
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-lg px-8 py-6">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">No credit card required • Free forever</p>
              </div>
            </div>

            {/* What's New preview */}
            {updates.length > 0 && (
              <section className="reveal translate-y-6 opacity-0 transition-all duration-700">
                <div className="max-w-3xl mx-auto bg-background/70 backdrop-blur-sm rounded-xl border p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5" />
                      <h3 className="text-lg font-semibold">What's New</h3>
                    </div>
                    <Link to="/updates" className="text-sm underline">View all</Link>
                  </div>
                  <div className="space-y-3">
                    {updates.map(u => (
                      <div key={u.id} className="p-3 rounded-lg border bg-card/60 relative overflow-hidden">
                        {u.badge_label && (
                          <div className="update-label update-label--danger">
                            {u.badge_label}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{u.title}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">v{u.version}</span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{u.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Instant Global Connection */}
            <section className="pt-20 reveal translate-y-6 opacity-0 transition-all duration-700">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <h3 className="text-3xl font-bold">Instant Global Connection</h3>
                  <p className="text-muted-foreground text-lg">
                    Click once and MeetMate instantly connects you to your friend—even if they’re sitting across the globe. Distance disappears, and you’re together in seconds.
                  </p>
                  <ul className="text-muted-foreground space-y-2 list-disc pl-5">
                    <li>One-click connection</li>
                    <li>Best for remote teams across the world</li>
                    <li>Optimized for any network speed</li>
                  </ul>
                </div>
                <div className="relative">
                  <div className="aspect-video bg-gradient-to-br from-pink-200 to-purple-200 rounded-2xl flex items-center justify-center">
                    <Users className="h-20 w-20 text-pink-600" />
                  </div>
                </div>
              </div>
            </section>

            {/* Built-in Chat */}
            <section className="pt-20 reveal translate-y-6 opacity-0 transition-all duration-700">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="relative order-2 md:order-1">
                  <div className="aspect-video bg-gradient-to-br from-blue-200 to-purple-200 rounded-2xl flex items-center justify-center">
                    <MessageCircle className="h-20 w-20 text-purple-600" />
                  </div>
                </div>
                <div className="space-y-6 order-1 md:order-2">
                  <h3 className="text-3xl font-bold">Built-in Chat Mechanism</h3>
                  <p className="text-muted-foreground text-lg">
                    Share jokes, send quick updates, or plan your next hangout with MeetMate’s lightweight, fun, and fast chat system.
                  </p>
                  <ul className="text-muted-foreground space-y-2 list-disc pl-5">
                    <li>Real-time messaging</li>
                    <li>Group & private chats</li>
                    <li>Reactions & emojis for fun conversations</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <div className="pt-20 text-center reveal translate-y-6 opacity-0 transition-all duration-700">
              <Card className="border-0 bg-gradient-to-r from-pink-100 to-blue-100 backdrop-blur-sm max-w-2xl mx-auto">
                <CardContent className="pt-8 pb-8">
                  <h3 className="text-2xl font-bold mb-4">Ready to Meet Your Friends?</h3>
                  <p className="text-muted-foreground mb-6">Join thousands of friends who connect instantly every day with MeetMate.</p>
                  <Link to="/auth">
                    <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90">
                      Create Your Free Account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-glow overflow-hidden">
                <img src="/icon.png" alt="MeetMate Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-sm text-muted-foreground">© 2024 MeetMate. All rights reserved.</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <a href="https://x.com/Zahid__Maken" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://github.com/Maken-HQ-Team/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/in/zahid-maken-5b4538372/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
