'use client'

import { useState, useEffect } from 'react'

const phrases = [
  "Hello Southa!",
  "Ziwaphi?",
  "Well, you've come to the right place",
  "Clicka daar!",
]

export function TypewriterHero() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    if (currentIndex >= phrases.length) {
      // Loop back or stay on last
      setCurrentIndex(0)
      return
    }

    const phrase = phrases[currentIndex]
    let charIndex = 0
    setIsTyping(true)
    setCurrentText('')

    // Type out the phrase
    const typeInterval = setInterval(() => {
      if (charIndex <= phrase.length) {
        setCurrentText(phrase.slice(0, charIndex))
        charIndex++
      } else {
        clearInterval(typeInterval)
        setIsTyping(false)
        
        // Wait, then move to next phrase
        setTimeout(() => {
          setCurrentIndex(prev => (prev + 1) % phrases.length)
        }, 2000) // Show completed text for 2 seconds
      }
    }, 60) // Typing speed

    return () => clearInterval(typeInterval)
  }, [currentIndex])

  // Blinking cursor
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 500)
    return () => clearInterval(cursorInterval)
  }, [])

  const getTextStyle = () => {
    switch (currentIndex) {
      case 0: return 'text-foreground'
      case 1: return 'text-primary'
      case 2: return 'text-foreground'
      case 3: return 'text-primary text-4xl md:text-6xl lg:text-7xl'
      default: return 'text-foreground'
    }
  }

  return (
    <div className="min-h-[120px] md:min-h-[160px] flex flex-col items-center justify-center">
      <h1 className={`text-3xl md:text-5xl lg:text-6xl font-bold transition-all duration-300 ${getTextStyle()}`}>
        {currentText}
      </h1>
      
      {/* Show arrow on last phrase when done typing */}
      {currentIndex === 3 && !isTyping && (
        <div className="mt-6 animate-bounce text-2xl">
          👇
        </div>
      )}
    </div>
  )
}
