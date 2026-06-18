'use client'

import { Activity, Target, TrendingUp, Users, Smartphone, Download, CheckCircle, Menu, X, Heart, BarChart3, MapPin, ArrowRight, Clock, Flame, Footprints, Github, Mail, Instagram, Linkedin } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'

export default function Home() {
  const [activeSection, setActiveSection] = useState('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)

      // Explicit check for the contact section (footer)
      // If the bottom of the viewport has scrolled at least 50px into the footer, it's active
      const contactEl = document.getElementById('contact')
      if (contactEl && window.scrollY + window.innerHeight >= contactEl.offsetTop + 50) {
        setActiveSection('contact')
        return
      }

      const sections = ['home', 'features', 'screenshots']
      const scrollPosition = window.scrollY + 200
      for (const id of sections) {
        const el = document.getElementById(id)
        if (el && scrollPosition >= el.offsetTop && scrollPosition < el.offsetTop + el.offsetHeight) {
          setActiveSection(id)
          break
        }
      }
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'features', label: 'Features' },
    { id: 'screenshots', label: 'App' },
    { id: 'contact', label: 'Contact' },
  ]

  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'py-2' : 'py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`navbar-glass rounded-full px-5 py-2.5 flex items-center justify-between transition-all duration-500 ${scrolled ? 'scrolled shadow-lg' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sage-700 flex items-center justify-center">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-sage-900">Stride</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <button key={link.id} onClick={() => scrollTo(link.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeSection === link.id ? 'bg-sage-100 text-sage-800' : 'text-sage-700 hover:text-sage-900 hover:bg-sage-50'}`}>
                  {link.label}
                </button>
              ))}
            </div>
            <div className="hidden md:block">
              <a href="https://github.com/sammyZi/Stride/releases/download/apk/Stride.apk" className="btn-primary text-sm py-2.5 px-5">
                <Download className="h-4 w-4" /> Download
              </a>
            </div>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-full hover:bg-sage-50" aria-label="Menu">
              {mobileMenuOpen ? <X className="h-5 w-5 text-sage-700" /> : <Menu className="h-5 w-5 text-sage-700" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-sage-200 overflow-hidden">
              {navLinks.map(link => (
                <button key={link.id} onClick={() => scrollTo(link.id)}
                  className={`block w-full text-left px-6 py-3 text-sm font-medium transition-colors ${activeSection === link.id ? 'text-sage-700 bg-sage-50' : 'text-sage-900 hover:bg-sage-50'}`}>
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-12 lg:pt-28 lg:pb-16">
        <div className="absolute inset-0 bg-dot-pattern opacity-40" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Left */}
            <div className="flex-1 text-center lg:text-left">
              <div className="glow-ring-wrapper mb-6">
                <div className="glow-ring-inner">
                  <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sage-600" />
                    </span>
                    <span className="text-xs font-bold tracking-wider uppercase text-sage-800/90">Available on Android</span>
                  </div>
                </div>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-bold leading-[1.05] tracking-tight text-sage-900 mb-5">
                The Future of<br />
                <span className="text-sage-600">Health Tracking</span><br />
                Today
              </h1>
              <p className="section-subtext mb-6 mx-auto lg:mx-0 max-w-xl text-sm sm:text-base">
                Experience smarter, real-time wellness insights with seamless tracking — empowering you to take control of your health every day.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6">
                <a href="https://github.com/sammyZi/Stride/releases/download/apk/Stride.apk" className="btn-primary py-2.5 px-6">
                  Get Started Now <ArrowRight className="h-4 w-4" />
                </a>
                <a href="https://github.com/sammyZi/Stride" target="_blank" rel="noopener noreferrer" className="btn-secondary py-2.5 px-6 flex items-center gap-2">
                  <Github className="h-4 w-4" /> Open Source
                </a>
              </div>
              <div className="space-y-2">
                {[
                  { icon: Heart, label: 'Track Wellness', desc: 'Monitor health data to track progress' },
                  { icon: BarChart3, label: 'Real-Time Insights', desc: 'Get real-time insights to optimize' },
                  { icon: Target, label: 'Personalized Goals', desc: 'Set tailored goals based on your data' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/40 backdrop-blur-sm rounded-xl p-2 border border-white/60">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <item.icon className="h-4 w-4 text-sage-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-sage-900 leading-tight">{item.label}</p>
                      <p className="text-[11px] text-sage-600 leading-tight">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Right - Phones */}
            <div className="flex-1 w-full max-w-lg lg:max-w-xl mx-auto mt-8 lg:mt-0">
              <div className="flex justify-center items-end gap-3 sm:gap-5">
                {/* Left phone */}
                <div className="hidden sm:block mt-6">
                  <div className="animate-float-slow">
                    <div className="phone-frame w-28 md:w-32 lg:w-36">
                      <Image src="/new_ss/activity_detail.jpeg" alt="Activity detail" width={180} height={360} className="w-full h-auto object-cover" />
                    </div>
                  </div>
                </div>
                {/* Center phone */}
                <div className="animate-float">
                  <div className="phone-frame w-40 sm:w-44 md:w-48 lg:w-52">
                    <Image src="/new_ss/activity.jpeg" alt="Stride App" width={240} height={480} className="w-full h-auto object-cover" />
                  </div>
                </div>
                {/* Right phone */}
                <div className="hidden sm:block mt-10">
                  <div className="animate-float-delayed">
                    <div className="phone-frame w-28 md:w-32 lg:w-36">
                      <Image src="/new_ss/goals.jpeg" alt="Goals" width={180} height={360} className="w-full h-auto object-cover" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>




      {/* Features */}
      <section id="features" className="py-20 md:py-28 relative overflow-hidden">
        <div className="orb orb-3" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <p className="text-sage-600 font-semibold text-sm uppercase tracking-wider mb-3">Features</p>
            <h2 className="section-heading mb-4">Revolutionizing Health<br />Tracking for Tomorrow</h2>
            <p className="section-subtext mx-auto">Stride offers innovative health tracking solutions to help you monitor, analyze, and improve your wellness daily.</p>
          </div>

          {/* Feature 1: Activity Tracking */}
          <div className="flex flex-col md:flex-row items-center gap-12 mb-24">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold mb-4">
                <Activity className="h-3.5 w-3.5" /> Activity Tracking
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-sage-900 mb-4">Track Every Step,<br />Run & Workout</h3>
              <p className="text-sage-600 leading-relaxed mb-6">Monitor your daily activities with real-time tracking. View distance, pace, calories burned, and duration for every session.</p>
              <div className="space-y-3">
                {['GPS route visualization', 'Live pace & distance stats', 'Calorie burn tracking'].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-sage-500 flex-shrink-0" />
                    <span className="text-sm text-sage-700 font-medium">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="animate-float">
                <div className="phone-frame w-52 sm:w-60">
                  <Image src="/new_ss/activity.jpeg" alt="Activity" width={256} height={500} className="w-full h-auto object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Activity Details */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-12 mb-24">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold mb-4">
                <MapPin className="h-3.5 w-3.5" /> Detailed Analysis
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-sage-900 mb-4">Deep Dive Into<br />Every Workout</h3>
              <p className="text-sage-600 leading-relaxed mb-6">View comprehensive activity breakdowns with route maps, split times, elevation data, and performance metrics all in one place.</p>
              <div className="space-y-3">
                {['Split-by-split breakdown', 'Elevation & pace charts', 'Route map overlay'].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-sage-500 flex-shrink-0" />
                    <span className="text-sm text-sage-700 font-medium">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-end gap-5">
              <div>
                <div className="animate-float-slow">
                  <div className="phone-frame w-36 sm:w-44">
                    <Image src="/new_ss/activity_detail.jpeg" alt="Detail 1" width={200} height={400} className="w-full h-auto object-cover" />
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <div className="animate-float-delayed">
                  <div className="phone-frame w-36 sm:w-44">
                    <Image src="/new_ss/activity_detail (2).jpeg" alt="Detail 2" width={200} height={400} className="w-full h-auto object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: Goals */}
          <div className="flex flex-col md:flex-row items-center gap-12 mb-24">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold mb-4">
                <Target className="h-3.5 w-3.5" /> Goal Setting
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-sage-900 mb-4">Set Goals,<br />Crush Milestones</h3>
              <p className="text-sage-600 leading-relaxed mb-6">Set personalized fitness goals and track progress with analytics, milestone celebrations, and achievement badges.</p>
              <div className="space-y-3">
                {['Custom distance & time goals', 'Progress visualization', 'Achievement celebrations'].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-sage-500 flex-shrink-0" />
                    <span className="text-sm text-sage-700 font-medium">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="animate-float">
                <div className="phone-frame w-52 sm:w-60">
                  <Image src="/new_ss/goals.jpeg" alt="Goals" width={256} height={500} className="w-full h-auto object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4: History */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-12 mb-24">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold mb-4">
                <TrendingUp className="h-3.5 w-3.5" /> Workout History
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-sage-900 mb-4">Your Complete<br />Fitness Journey</h3>
              <p className="text-sage-600 leading-relaxed mb-6">Review complete workout history with detailed statistics, charts, and insights. Analyze trends and see how far you&apos;ve come.</p>
              <div className="space-y-3">
                {['Monthly & weekly summaries', 'Trend analysis charts', 'Personal best tracking'].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-sage-500 flex-shrink-0" />
                    <span className="text-sm text-sage-700 font-medium">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="animate-float-delayed">
                <div className="phone-frame w-52 sm:w-60">
                  <Image src="/new_ss/history.jpeg" alt="History" width={256} height={500} className="w-full h-auto object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 5: Profile & Stats */}
          <div className="flex flex-col md:flex-row items-center gap-12 mb-24">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold mb-4">
                <Users className="h-3.5 w-3.5" /> Profile & Stats
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-sage-900 mb-4">Comprehensive<br />Profile & Analytics</h3>
              <p className="text-sage-600 leading-relaxed mb-6">Customize your profile with personal stats, achievements, and preferences. Track overall progress with beautifully crafted charts.</p>
              <div className="space-y-3">
                {['In-depth statistical breakdown', 'Visual trend tracking', 'Personal bests & milestones'].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-sage-500 flex-shrink-0" />
                    <span className="text-sm text-sage-700 font-medium">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center items-end gap-3 sm:gap-4">
              <div className="mt-8">
                <div className="animate-float-slow">
                  <div className="phone-frame w-28 sm:w-36">
                    <Image src="/new_ss/profile_stats (3).jpeg" alt="Stats 3" width={180} height={360} className="w-full h-auto object-cover" />
                  </div>
                </div>
              </div>
              <div className="animate-float">
                <div className="phone-frame w-36 sm:w-48">
                  <Image src="/new_ss/profile_stats.jpeg" alt="Profile" width={220} height={440} className="w-full h-auto object-cover" />
                </div>
              </div>
              <div className="mt-8">
                <div className="animate-float-delayed">
                  <div className="phone-frame w-28 sm:w-36">
                    <Image src="/new_ss/profile_stats (2).jpeg" alt="Stats 2" width={180} height={360} className="w-full h-auto object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 6: Settings */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage-100 text-sage-700 text-xs font-semibold mb-4">
                <Smartphone className="h-3.5 w-3.5" /> Smart Settings
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-sage-900 mb-4">Personalize<br />Your Experience</h3>
              <p className="text-sage-600 leading-relaxed mb-6">Customizable settings, notifications, units, and privacy controls for an optimal, personalized app experience.</p>
              <div className="space-y-3">
                {['Unit preferences', 'Notification controls', 'Privacy & data settings'].map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-sage-500 flex-shrink-0" />
                    <span className="text-sm text-sage-700 font-medium">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="animate-float">
                <div className="phone-frame w-52 sm:w-60">
                  <Image src="/new_ss/settings.jpeg" alt="Settings" width={256} height={500} className="w-full h-auto object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Showcase / CTA */}
      <section id="screenshots" className="py-20 md:py-28 bg-sage-100 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-pattern opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <p className="text-sage-600 font-semibold text-sm uppercase tracking-wider mb-3">Mobile App</p>
              <h2 className="section-heading mb-4">Track Your Health<br />Anytime, Anywhere</h2>
              <p className="section-subtext mb-8">Stride&apos;s mobile app brings advanced health tracking to your fingertips — monitor vital stats, set wellness goals, and get real-time insights anytime, anywhere.</p>
              <div className="space-y-4 mb-8">
                {[
                  { icon: Heart, title: 'Track Wellness Effectively', desc: 'Monitor health data to track progress and improve wellness.' },
                  { icon: BarChart3, title: 'Real-Time Insights Provided', desc: 'Get real-time insights to optimize your health and fitness.' },
                  { icon: Target, title: 'Personalized Health Goals', desc: 'Set tailored goals based on your health data.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 border border-sage-200 hover:bg-white transition-all duration-300">
                    <div className="w-10 h-10 rounded-xl bg-sage-600 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sage-900 text-sm">{item.title}</p>
                      <p className="text-xs text-sage-600 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href="https://github.com/sammyZi/Stride/releases/download/apk/Stride.apk" className="btn-primary">
                <Download className="h-4 w-4" /> Download Free
              </a>
            </div>
            <div className="lg:w-1/2 flex justify-center">
              <div className="relative flex items-end gap-4">
                <div>
                  <div className="animate-float-slow">
                    <div className="phone-frame w-44 sm:w-52">
                      <Image src="/new_ss/login.jpeg" alt="Login" width={220} height={440} className="w-full h-auto object-cover" />
                    </div>
                  </div>
                </div>
                <div className="z-10 animate-float">
                  <div className="phone-frame w-48 sm:w-56">
                    <Image src="/new_ss/activity.jpeg" alt="App" width={240} height={480} className="w-full h-auto object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20 divide-y md:divide-y-0 md:divide-x divide-sage-200/60">
            {[
              { icon: CheckCircle, title: 'Free Forever', desc: 'No hidden fees, no premium tiers. Full access always.' },
              { icon: Footprints, title: 'No Ads Ever', desc: 'Clean, distraction-free experience focused on you.' },
              { icon: Smartphone, title: 'Works Offline', desc: 'Track activities even without an internet connection.' },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center text-center group ${i !== 0 ? 'pt-12 md:pt-0' : ''}`}>
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-sage-300/30 rounded-full blur-xl transform scale-50 opacity-0 group-hover:scale-150 group-hover:opacity-100 transition-all duration-500 ease-out" />
                  <div className="w-16 h-16 rounded-full flex items-center justify-center relative z-10 text-sage-600">
                    <item.icon className="h-8 w-8 transition-transform duration-500 group-hover:-translate-y-1 group-hover:text-sage-800" strokeWidth={1.5} />
                  </div>
                </div>
                <h3 className="font-serif text-2xl font-bold text-sage-900 mb-3">{item.title}</h3>
                <p className="text-sage-600 leading-relaxed max-w-[260px]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-sage-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-sage-800 pb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-sage-600 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <span className="text-2xl font-serif font-bold">Stride</span>
              </div>
              <p className="text-sage-400 max-w-sm mb-6 leading-relaxed">
                Experience smarter, real-time wellness insights with seamless tracking — empowering you to take control of your health every day.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://github.com/sammyZi" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-sage-800 flex items-center justify-center text-sage-400 hover:text-white hover:bg-sage-700 transition-all hover:-translate-y-1">
                  <Github className="h-5 w-5" />
                </a>
                <a href="mailto:bhingesamarth@gmail.com" className="w-10 h-10 rounded-full bg-sage-800 flex items-center justify-center text-sage-400 hover:text-white hover:bg-sage-700 transition-all hover:-translate-y-1">
                  <Mail className="h-5 w-5" />
                </a>
                <a href="https://www.instagram.com/sammyi_57/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-sage-800 flex items-center justify-center text-sage-400 hover:text-white hover:bg-sage-700 transition-all hover:-translate-y-1">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="https://www.linkedin.com/in/samarth-bhinge/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-sage-800 flex items-center justify-center text-sage-400 hover:text-white hover:bg-sage-700 transition-all hover:-translate-y-1">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-4">Quick Links</h4>
              <ul className="space-y-3 text-sage-400 text-sm">
                {navLinks.map(link => (
                  <li key={link.id}>
                    <button onClick={() => scrollTo(link.id)} className="hover:text-white transition-colors">
                      {link.label}
                    </button>
                  </li>
                ))}
                <li>
                  <a href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-4">Connect</h4>
              <ul className="space-y-3 text-sage-400 text-sm">
                <li><a href="https://github.com/sammyZi" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="https://www.linkedin.com/in/samarth-bhinge/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a></li>
                <li><a href="https://www.instagram.com/sammyi_57/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="mailto:bhingesmaerth@gmail.com" className="hover:text-white transition-colors">Email Me</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sage-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Stride. Designed by Samarth Bhinge.</p>
            <p>Built with ❤️ for fitness enthusiasts</p>
          </div>
        </div>
      </footer>
    </div>
  )
}