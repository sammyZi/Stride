'use client'

import { ArrowLeft, Download, Settings, Smartphone, CheckCircle, Shield, Battery, Bell, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function GuidePage() {
    const router = useRouter()

    const installSteps = [
        {
            number: 1,
            icon: Download,
            title: 'Download the App',
            description: 'Get Stride from Google Play Store or Apple App Store. The app is free to download with no ads or subscriptions.',
            color: 'from-blue-500 to-blue-600'
        },
        {
            number: 2,
            icon: Smartphone,
            title: 'Install & Open',
            description: 'Once downloaded, tap to install and open the app. Grant the initial permissions when prompted.',
            color: 'from-purple-500 to-purple-600'
        },
        {
            number: 3,
            icon: Settings,
            title: 'Set Up Your Profile',
            description: 'Enter your basic information like height, weight, and fitness goals to get personalized tracking.',
            color: 'from-green-500 to-green-600'
        }
    ]

    const permissions = [
        {
            icon: '📍',
            title: 'Location Access',
            description: 'Required for tracking your running and walking routes',
            action: 'Allow "All the time" for background tracking'
        },
        {
            icon: '🔔',
            title: 'Notifications',
            description: 'Get real-time updates during workouts and achievement alerts',
            action: 'Enable notifications in app settings'
        },
        {
            icon: '🔋',
            title: 'Battery Optimization',
            description: 'Prevent the app from being closed during workouts',
            action: 'Disable battery optimization for Stride'
        },
        {
            icon: '💾',
            title: 'Storage Access',
            description: 'Save your workout history and export data',
            action: 'Allow storage permissions when prompted'
        }
    ]

    const batterySteps = [
        'Open Settings → Apps → Stride',
        'Tap on Battery → Select "Unrestricted"',
        'Enable "Allow background activity"',
        'Lock app in Recent Apps (tap 3-dot menu)'
    ]

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            <span className="font-semibold">Back to Home</span>
                        </button>
                        <h1 className="text-lg font-bold text-gray-900">Installation Guide</h1>
                        <div className="w-24"></div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-6 shadow-lg">
                        <Shield className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                        Get Started with Stride
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Follow this comprehensive guide to install the app and set up permissions for the best tracking experience.
                    </p>
                </div>

                {/* Installation Steps */}
                <section className="mb-16">
                    <div className="flex items-center mb-8">
                        <Download className="h-6 w-6 text-blue-600 mr-3" />
                        <h3 className="text-2xl font-bold text-gray-900">Installation Steps</h3>
                    </div>

                    <div className="space-y-6">
                        {installSteps.map((step) => {
                            const Icon = step.icon
                            return (
                                <div key={step.number} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
                                    <div className="p-6 flex items-start space-x-4">
                                        <div className={`flex-shrink-0 w-14 h-14 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center shadow-md`}>
                                            <span className="text-2xl font-bold text-white">{step.number}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center mb-2">
                                                <Icon className="h-5 w-5 text-blue-600 mr-2" />
                                                <h4 className="text-xl font-semibold text-gray-900">{step.title}</h4>
                                            </div>
                                            <p className="text-gray-600 leading-relaxed">{step.description}</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Permissions */}
                <section className="mb-16">
                    <div className="flex items-center mb-8">
                        <Settings className="h-6 w-6 text-purple-600 mr-3" />
                        <h3 className="text-2xl font-bold text-gray-900">Required Permissions</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {permissions.map((permission, index) => (
                            <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow">
                                <div className="text-4xl mb-4">{permission.icon}</div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">{permission.title}</h4>
                                <p className="text-gray-600 text-sm mb-3">{permission.description}</p>
                                <div className="flex items-start space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm font-medium text-blue-900">{permission.action}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Battery Optimization Guide */}
                <section className="mb-16">
                    <div className="flex items-center mb-8">
                        <Battery className="h-6 w-6 text-green-600 mr-3" />
                        <h3 className="text-2xl font-bold text-gray-900">If App Closes After Some Time</h3>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg border border-green-200 p-8">
                        <div className="flex items-start mb-6">
                            <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
                                <Bell className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 mb-2">Battery Optimization Setup</h4>
                                <p className="text-gray-700 text-sm">
                                    To ensure the app continues tracking your workouts when the screen is off, follow these steps:
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {batterySteps.map((step, index) => (
                            <div key={index} className="flex items-start space-x-3 bg-white rounded-lg p-4 shadow-sm">
                                <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-bold text-white">{index + 1}</span>
                                </div>
                                <p className="text-gray-800 font-medium pt-1">{step}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-900">
                            <strong>Note:</strong> Steps may vary slightly depending on your device manufacturer (Samsung, Xiaomi, OnePlus, etc.)
                        </p>
                    </div>
                </section>

                {/* Verification */}
                <section className="mb-16">
                    <div className="flex items-center mb-8">
                        <CheckCircle className="h-6 w-6 text-blue-600 mr-3" />
                        <h3 className="text-2xl font-bold text-gray-900">Test Your Setup</h3>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                        <p className="text-gray-700 mb-6">Follow these steps to verify everything is working correctly:</p>
                        <ol className="space-y-4">
                            {[
                                'Start a workout in the app',
                                'Press the home button (don\'t close the app)',
                                'Check for the persistent notification',
                                'Wait 2-3 minutes',
                                'Return to the app - your distance should have increased'
                            ].map((step, index) => (
                                <li key={index} className="flex items-start space-x-3">
                                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <span className="text-gray-800 pt-1">{step}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* CTA */}
                <div className="text-center bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-12 shadow-lg border border-blue-100">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Tracking?</h3>
                    <p className="text-gray-700 mb-8 max-w-2xl mx-auto">
                        Download Stride now and begin your fitness journey with confidence.
                    </p>
                    <a
                        href="https://github.com/sammyZi/Stride/releases/download/apk/app-release.apk"
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-full text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-xl inline-flex items-center space-x-2"
                    >
                        <Download className="h-5 w-5" />
                        <span>Download Now</span>
                    </a>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-8 mt-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400">© 2026 Stride. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
