'use client'

import {
  Activity,
  Target,
  TrendingUp,
  Users,
  Smartphone,
  Download,
  CheckCircle,
  Menu,
  X
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function Home() {
  const [activeSection, setActiveSection] = useState('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'features', 'contact']
      const scrollPosition = window.scrollY + 200

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId)
            break
          }
        }
      }
    }

    handleScroll() // Call once on mount
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen">
      {/* Floating Navigation */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[calc(100%-2rem)] md:w-auto">
        <div className="relative bg-white/30 md:bg-white/30 backdrop-blur-xl rounded-full px-4 md:px-6 py-2.5 md:py-3 shadow-xl navbar-animated-border">
          <div className="flex items-center justify-between md:space-x-8">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              <span className="text-base md:text-lg font-bold text-gray-900">FitTracker</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-6 relative">
              <button
                onClick={() => scrollToSection('home')}
                className={`text-sm font-semibold transition-colors duration-500 ease-in-out relative ${activeSection === 'home'
                  ? 'text-blue-600'
                  : 'text-gray-900 hover:text-blue-600'
                  }`}
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className={`text-sm font-semibold transition-colors duration-500 ease-in-out relative ${activeSection === 'features'
                  ? 'text-blue-600'
                  : 'text-gray-900 hover:text-blue-600'
                  }`}
              >
                Features
              </button>

              <button
                onClick={() => scrollToSection('contact')}
                className={`text-sm font-semibold transition-colors duration-500 ease-in-out relative ${activeSection === 'contact'
                  ? 'text-blue-600'
                  : 'text-gray-900 hover:text-blue-600'
                  }`}
              >
                Contact
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-gray-700" />
              ) : (
                <Menu className="h-5 w-5 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="flex flex-col py-2">
              <button
                onClick={() => scrollToSection('home')}
                className={`px-6 py-3 text-left text-sm font-semibold transition-colors ${activeSection === 'home'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className={`px-6 py-3 text-left text-sm font-semibold transition-colors ${activeSection === 'features'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Features
              </button>

              <button
                onClick={() => scrollToSection('contact')}
                className={`px-6 py-3 text-left text-sm font-semibold transition-colors ${activeSection === 'contact'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-900 hover:bg-gray-50'
                  }`}
              >
                Contact
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-50 pt-20 pb-12 md:pt-0 md:pb-0">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>

        {/* Soft Blurred Orbs/Bubbles */}
        <div className="absolute top-0 left-0 w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 bg-blue-200/50 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-1/4 right-0 w-40 h-40 sm:w-64 sm:h-64 md:w-80 md:h-80 bg-purple-200/50 rounded-full blur-3xl animate-pulse-slower"></div>
        <div className="absolute bottom-0 left-1/4 w-56 h-56 sm:w-80 sm:h-80 md:w-[500px] md:h-[500px] bg-indigo-200/40 rounded-full blur-3xl animate-pulse-center"></div>
        <div className="absolute top-1/2 right-1/4 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-pink-200/40 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-0 w-36 h-36 sm:w-56 sm:h-56 md:w-72 md:h-72 bg-cyan-200/40 rounded-full blur-3xl animate-pulse-slower"></div>
        <div className="absolute top-10 right-1/3 w-24 h-24 sm:w-40 sm:h-40 md:w-56 md:h-56 bg-violet-200/35 rounded-full blur-3xl animate-pulse-center"></div>
        <div className="absolute bottom-20 left-0 w-28 h-28 sm:w-44 sm:h-44 md:w-60 md:h-60 bg-rose-200/30 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute top-1/3 left-1/3 w-20 h-20 sm:w-32 sm:h-32 md:w-48 md:h-48 bg-sky-200/35 rounded-full blur-3xl animate-pulse-slower"></div>

        {/* Floating Particles - hidden on mobile for performance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
          <div className="particle particle-5"></div>
          <div className="particle particle-6"></div>
        </div>

        {/* Main Hero Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 lg:gap-12">
            {/* Text Content */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm mb-4 sm:mb-6 md:mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs sm:text-sm text-gray-700 font-medium">Now available on iOS & Android</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-3 sm:mb-4 md:mb-6 leading-[1.1] tracking-tight">
                Track Every Step
                <span className="block mt-1 sm:mt-2 text-purple-600 pb-1 sm:pb-2">
                  Run Every Mile
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 md:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed px-2 sm:px-0">
                The ultimate walking and running tracker. Monitor your pace, distance, and progress with precision designed for athletes.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start px-4 sm:px-0">
                <button className="px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-white bg-purple-600 active:bg-purple-700 sm:hover:bg-purple-500 transition-all duration-300 sm:hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base">
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  Start Tracking Free
                </button>
                <a href="/guide" className="w-full sm:w-auto">
                  <button className="w-full px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-gray-700 border-2 border-gray-300 active:border-purple-400 sm:hover:border-purple-400 sm:hover:text-purple-600 bg-white transition-all duration-300 sm:hover:scale-105 shadow-sm text-sm sm:text-base">
                    Learn More
                  </button>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 mt-6 sm:mt-10 md:mt-12 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <span>Free forever</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <span>No ads</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <span>Works offline</span>
                </div>
              </div>
            </div>

            {/* Phone Mockups */}
            <div className="flex-1 relative mt-6 sm:mt-8 lg:mt-0 w-full max-w-md lg:max-w-none mx-auto">
              <div className="relative flex justify-center items-center min-h-[280px] sm:min-h-[350px] md:min-h-[400px]">
                {/* Glow Effect Behind Phones */}
                <div className="absolute inset-0 bg-purple-300/20 sm:bg-purple-300/30 blur-3xl rounded-full scale-125 sm:scale-150"></div>
                
                {/* Left Phone - Hidden on mobile */}
                <div className="hidden sm:block absolute -left-4 md:left-0 lg:-left-8 top-8 md:top-12 z-10 transform -rotate-6">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-blue-400/30 rounded-[2rem] sm:rounded-[2.5rem] blur"></div>
                    <div className="relative bg-white rounded-[2rem] sm:rounded-[2.5rem] p-1 sm:p-1.5 shadow-2xl">
                      <Image
                        src="/walking_hero.png"
                        alt="Walking tracking"
                        width={180}
                        height={360}
                        className="rounded-[1.5rem] sm:rounded-[2rem] w-28 sm:w-36 md:w-44 h-auto object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Center Phone - Main */}
                <div className="relative z-20">
                  <div className="absolute -inset-2 bg-purple-400/40 rounded-[2.5rem] sm:rounded-[3rem] blur animate-pulse-slow"></div>
                  <div className="relative bg-white rounded-[2.5rem] sm:rounded-[3rem] p-1.5 sm:p-2 shadow-2xl">
                    <Image
                      src="/app_ss/activity.jpeg"
                      alt="FitTracker App"
                      width={240}
                      height={480}
                      className="rounded-[2rem] sm:rounded-[2.5rem] w-40 sm:w-48 md:w-52 lg:w-60 h-auto object-cover"
                    />
                  </div>
                </div>

                {/* Right Phone - Hidden on mobile */}
                <div className="hidden sm:block absolute -right-4 md:right-0 lg:-right-8 top-8 md:top-12 z-10 transform rotate-6">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-pink-400/30 rounded-[2rem] sm:rounded-[2.5rem] blur"></div>
                    <div className="relative bg-white rounded-[2rem] sm:rounded-[3rem] p-1 sm:p-1.5 shadow-2xl">
                      <Image
                        src="/running_hero.png"
                        alt="Running tracking"
                        width={180}
                        height={360}
                        className="rounded-[1.5rem] sm:rounded-[2rem] w-28 sm:w-36 md:w-44 h-auto object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-100/30 to-pink-100/30 rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Everything You Need to Stay Fit
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Our app combines powerful tracking features with an intuitive interface
              to help you reach your fitness goals faster.
            </p>
          </div>

          <div className="space-y-24">
            {/* Activity Tracking - Image Left */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/3">
                <div className="relative w-64 h-[500px] mx-auto border-2 border-blue-600/30 rounded-3xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl"></div>
                  <Image
                    src="/app_ss/activity.jpeg"
                    alt="Activity Tracking Screen"
                    width={256}
                    height={500}
                    className="relative z-10 object-contain w-full h-full rounded-3xl shadow-2xl"
                  />
                </div>
              </div>
              <div className="md:w-2/3">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Activity className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Activity Tracking</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Monitor your daily activities with real-time tracking. View distance, pace, calories burned, and duration for every workout session. Get detailed insights into your performance and stay motivated with live stats.
                </p>
              </div>
            </div>

            {/* Goals - Image Right */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="md:w-1/3">
                <div className="relative w-64 h-[500px] mx-auto border-2 border-green-600/30 rounded-3xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl"></div>
                  <Image
                    src="/app_ss/goals.jpeg"
                    alt="Goals Screen"
                    width={256}
                    height={500}
                    className="relative z-10 object-contain w-full h-full rounded-3xl shadow-2xl"
                  />
                </div>
              </div>
              <div className="md:w-2/3">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Goal Setting</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Set personalized fitness goals and track your progress with detailed analytics, milestone celebrations, and achievement badges. Stay focused and motivated as you work towards your targets.
                </p>
              </div>
            </div>

            {/* History - Image Left */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/3">
                <div className="relative w-64 h-[500px] mx-auto border-2 border-purple-600/30 rounded-3xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl"></div>
                  <Image
                    src="/app_ss/history.jpeg"
                    alt="History Screen"
                    width={256}
                    height={500}
                    className="relative z-10 object-contain w-full h-full rounded-3xl shadow-2xl"
                  />
                </div>
              </div>
              <div className="md:w-2/3">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Workout History</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Review your complete workout history with detailed statistics, charts, and insights to understand your fitness journey. Analyze trends and see how far you've come.
                </p>
              </div>
            </div>

            {/* Profile - Image Right */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12">
              <div className="md:w-1/3">
                <div className="relative w-64 h-[500px] mx-auto border-2 border-orange-600/30 rounded-3xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-red-100 rounded-3xl"></div>
                  <Image
                    src="/app_ss/profile.jpeg"
                    alt="Profile Screen"
                    width={256}
                    height={500}
                    className="relative z-10 object-contain w-full h-full rounded-3xl shadow-2xl"
                  />
                </div>
              </div>
              <div className="md:w-2/3">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Personal Profile</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Customize your profile with personal stats, achievements, and preferences. Track your overall progress and milestones while celebrating your fitness accomplishments.
                </p>
              </div>
            </div>

            {/* Settings - Image Left */}
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="md:w-1/3">
                <div className="relative w-64 h-[500px] mx-auto border-2 border-cyan-600/30 rounded-3xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-3xl"></div>
                  <Image
                    src="/app_ss/settings.jpeg"
                    alt="Settings Screen"
                    width={256}
                    height={500}
                    className="relative z-10 object-contain w-full h-full rounded-3xl shadow-2xl"
                  />
                </div>
              </div>
              <div className="md:w-2/3">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 w-16 h-16 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <Smartphone className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900">Smart Settings</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Personalize your app experience with customizable settings, notifications, units, and privacy controls for optimal use. Make the app work exactly how you want it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Activity className="h-6 w-6" />
              <span className="text-xl font-bold">FitTracker</span>
            </div>
            <div className="text-gray-400 text-center md:text-right">
              <p>&copy; 2024 FitTracker. All rights reserved.</p>
              <p className="mt-1">Built with ❤️ for fitness enthusiasts</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}