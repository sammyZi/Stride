'use client'

import { Activity } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'features', 'download', 'contact']
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/90 backdrop-blur-lg border border-gray-200 rounded-full px-6 py-3 shadow-lg">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-primary-600" />
            <span className="text-lg font-bold text-gray-900">Stride</span>
          </div>
          <div className="hidden md:flex space-x-6">
            <button
              onClick={() => scrollToSection('features')}
              className={`text-sm font-medium transition-colors ${
                activeSection === 'features'
                  ? 'text-primary-600'
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('download')}
              className={`text-sm font-medium transition-colors ${
                activeSection === 'download'
                  ? 'text-primary-600'
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Download
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className={`text-sm font-medium transition-colors ${
                activeSection === 'contact'
                  ? 'text-primary-600'
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Contact
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
