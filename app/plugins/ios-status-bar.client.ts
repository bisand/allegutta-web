import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(() => {
    // Only run on client side and on iOS devices
    if (import.meta.client && /iPad|iPhone|iPod/.test(navigator.userAgent)) {

        const updateStatusBar = () => {
            // Check if dark mode is active
            const html = document.documentElement
            const isDark = html.classList.contains('dark') ||
                (!html.classList.contains('light') &&
                    window.matchMedia &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches)

            // Update theme-color meta tag for the browser UI
            let themeColorMeta = document.querySelector('meta[name="theme-color"]')
            if (!themeColorMeta) {
                themeColorMeta = document.createElement('meta')
                themeColorMeta.setAttribute('name', 'theme-color')
                document.head.appendChild(themeColorMeta)
            }

            // Set theme color to match the actual app background colors
            // App uses: bg-gray-50 (light) and bg-gray-900 (dark)
            const themeColor = isDark ? '#111827' : '#f9fafb'  // gray-900 : gray-50
            themeColorMeta.setAttribute('content', themeColor)

            // Update iOS status bar style
            let statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
            if (!statusBarMeta) {
                statusBarMeta = document.createElement('meta')
                statusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style')
                document.head.appendChild(statusBarMeta)
            }

            // Based on https://www.devasking.com/issue/dynamically-change-status-bar-color-in-ios-for-pwa-apps
            // iOS 14.5+ introduced 'dark-content' for white status bar with dark text
            // 'black-translucent': White text on translucent background (good for dark apps)
            // 'dark-content': Dark text on white background (new in iOS 14.5+)
            // 'default': White background with black text (traditional)

            let statusBarStyle
            if (isDark) {
                // For dark theme: use black-translucent for white text on dark background
                statusBarStyle = 'black-translucent'
            } else {
                // For light theme: try the new 'dark-content' value first, fallback to 'default'
                statusBarStyle = 'dark-content'  // New iOS 14.5+ value
            }

            statusBarMeta.setAttribute('content', statusBarStyle)

            // Try to force update by temporarily changing and restoring the value
            // This technique is mentioned in some iOS PWA forums
            setTimeout(() => {
                const originalValue = statusBarMeta.getAttribute('content')
                statusBarMeta.setAttribute('content', 'default')
                setTimeout(() => {
                    statusBarMeta.setAttribute('content', originalValue!)
                }, 10)
            }, 50)

            // Debug information
            console.log('🔧 iOS Status Bar Debug:', {
                isDark,
                statusBarStyle,
                themeColor,
                htmlClasses: Array.from(html.classList),
                isStandalone: 'standalone' in window.navigator ? (window.navigator as { standalone?: boolean }).standalone : false,
                userAgent: navigator.userAgent,
                currentMetaContent: statusBarMeta.getAttribute('content')
            })
        }

        // Initial update with delay to ensure DOM is ready
        setTimeout(updateStatusBar, 100)

        // Also run immediately
        updateStatusBar()

        // Watch for theme changes on the html element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    console.log('🔧 Theme change detected, updating status bar')
                    setTimeout(updateStatusBar, 50)
                }
            })
        })

        // Observe changes to the html class attribute
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })

        // Also listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            mediaQuery.addEventListener('change', () => {
                console.log('🔧 System theme change detected')
                setTimeout(updateStatusBar, 50)
            })
        }

        // Listen for app becoming active (iOS PWA focus events)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔧 App became visible, updating status bar')
                setTimeout(updateStatusBar, 100)
            }
        })

        // Also listen for page load events
        window.addEventListener('load', () => {
            console.log('🔧 Page loaded, updating status bar')
            setTimeout(updateStatusBar, 200)
        })
    }
})