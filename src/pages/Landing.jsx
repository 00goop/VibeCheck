import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import {
  Zap, Users, Sparkles, Target, MessageSquare,
  TrendingUp, Brain, Flame, TrendingDown, Lightbulb, Briefcase,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Navbar } from '../components/Navbar'

const fadeUpVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
}

function AnimatedSection({ children, delay = 0 }) {
  const reduceMotion=useReducedMotion()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion?false:"hidden"}
      animate={isInView ? 'visible' : 'hidden'}
      variants={fadeUpVariants}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const reduceMotion=useReducedMotion()
  const [glowPosition, setGlowPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if(reduceMotion)return
    let frame=0
    const handleMouseMove = (e) => {
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(()=>setGlowPosition({ x: e.clientX, y: e.clientY }))
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => {cancelAnimationFrame(frame);window.removeEventListener('mousemove', handleMouseMove)}
  }, [reduceMotion])

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      {/* Animated Glow Effect */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `radial-gradient(600px circle at ${glowPosition.x}px ${glowPosition.y}px, rgba(250, 204, 21, 0.1), transparent 40%)`,
        }}
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary via-yellow-300 to-primary bg-clip-text text-transparent animate-pulse">
                VibeCheck
              </span>
              <br />
              <span className="text-white">Drop Your Card.</span>
              <br />
              <span className="text-white">Find Your People.</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            AI-powered icebreakers. Real connections. Zero cringe.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg rounded-2xl px-8 py-6 hover:scale-105 transition-transform"
              onClick={() => navigate('/enter')}
            >
              <Zap className="w-5 h-5 mr-2" fill="currentColor" />
              Start Vibing
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="font-bold text-lg rounded-2xl px-8 py-6 border-white/20 hover:border-primary hover:text-primary hover:scale-105 transition-all"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </Button>
          </motion.div>
        </div>
      </section>

      {/* App Showcase */}
      <section className="py-24 px-4 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-4">
              See It In <span className="text-primary">Action</span>
            </h2>
            <p className="text-center text-muted-foreground text-lg mb-16">
              Screenshots from the original team project
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { src: '/screenshots/card.png', label: 'Build Your Vibe Card' },
              { src: '/screenshots/Room.png', label: 'Browse The Room' },
              { src: '/screenshots/Match.png', label: 'Get Matched' },
              { src: '/screenshots/Match2.png', label: 'Track Your Matches' },
            ].map((screenshot, i) => (
              <AnimatedSection key={i} delay={i * 0.15}>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative rounded-3xl border-2 border-white/10 bg-white/5 overflow-hidden shadow-2xl shadow-primary/10 hover:border-primary/50 hover:scale-105 transition-all">
                    <img
                      src={screenshot.src}
                      alt={screenshot.label}
                      className="w-full h-auto"
                    />
                  </div>
                  <p className="text-muted-foreground font-medium">{screenshot.label}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
              How It <span className="text-primary">Works</span>
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: '01', icon: Users, title: 'Join or Create', description: 'Enter a room code or create your own event space' },
              { step: '02', icon: Sparkles, title: 'Build Your Card', description: 'Share your project, skills, and energy level with the squad' },
              { step: '03', icon: Target, title: 'Find Your Vibe', description: 'Browse cards filtered by energy and interests' },
              { step: '04', icon: MessageSquare, title: 'Shoot Your Shot', description: 'AI crafts your perfect icebreaker. Watch the magic happen.' },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-primary/50 transition-all hover:scale-105 group">
                  <div className="text-primary/30 font-black text-6xl mb-4">{item.step}</div>
                  <item.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-xl mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 px-4 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-16">
              Why <span className="text-primary">VibeCheck?</span>
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'Instant Matches', description: 'Real-time notifications when someone vibes with you' },
              { icon: Brain, title: 'AI Icebreakers', description: 'Five personalities to match any mood—from hype to philosophy' },
              { icon: Target, title: 'Energy Filtering', description: 'Find hackers who match your current vibe (1-10)' },
              { icon: Sparkles, title: 'Zero Setup', description: 'No accounts. No emails. Just a room code and you\'re in.' },
              { icon: TrendingUp, title: 'Track Your Matches', description: 'Export contacts as CSV. Keep the connections alive post-event.' },
              { icon: Users, title: 'Team Building', description: 'Perfect for finding co-founders, mentors, or late-night debug buddies' },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-primary/50 transition-all hover:scale-105 group">
                  <item.icon className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* AI Personality Showcase */}
      <section className="py-24 px-4 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection>
            <h2 className="text-4xl md:text-5xl font-black text-center mb-4">
              Pick Your <span className="text-primary">Personality</span>
            </h2>
            <p className="text-center text-muted-foreground text-lg mb-16">
              AI icebreakers tailored to your mood
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: Flame, title: 'Hype', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', example: 'YO! What you\'re working on is FIRE! Let\'s collab and make this LEGENDARY!' },
              { icon: TrendingDown, title: 'Roast', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', example: 'Using PHP in 2026? Bold choice. Let\'s talk about why JavaScript exists.' },
              { icon: Lightbulb, title: 'Philosopher', color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', example: 'In the grand tapestry of code, what is a bug but a feature waiting to be understood?' },
              { icon: Briefcase, title: 'Investor', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', example: 'I see potential here. What\'s your go-to-market strategy and projected TAM?' },
            ].map((personality, i) => (
              <AnimatedSection key={i} delay={i * 0.1}>
                <div className={`${personality.bgColor} border ${personality.borderColor} rounded-2xl p-6 hover:scale-105 transition-all`}>
                  <div className="flex items-center gap-3 mb-4">
                    <personality.icon className={`w-8 h-8 ${personality.color}`} />
                    <h3 className="font-bold text-xl">{personality.title}</h3>
                  </div>
                  <p className="text-muted-foreground italic">"{personality.example}"</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 px-4 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <AnimatedSection>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {[
                  { value: '0', label: 'Sign-ups Required' },
                  { value: '1', label: 'Card Per Room' },
                  { value: '5', label: 'AI Personalities' },
                  { value: 'Need ↔ Offer', label: 'Complementary Matching' },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-4xl md:text-5xl font-black text-primary mb-2">{stat.value}</div>
                    <div className="text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-4 relative z-10">
        <div className="container mx-auto max-w-4xl text-center">
          <AnimatedSection>
            <h2 className="text-4xl md:text-6xl font-black mb-6">
              Ready to <span className="text-primary">Vibe?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Bring your project, find a complementary skill, and start a conversation.
            </p>
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg rounded-2xl px-12 py-8 hover:scale-105 transition-transform"
              onClick={() => navigate('/enter')}
            >
              <Zap className="w-6 h-6 mr-2" fill="currentColor" />
              Get Started Now
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10 relative z-10">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground">
          <p>Built with love for hackers, by hackers.</p>
        </div>
      </footer>
    </div>
  )
}
