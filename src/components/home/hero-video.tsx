'use client'

import { useEffect, useState } from 'react'

/**
 * The homepage hero video, mounted only on viewports wide enough to be worth
 * it — and only after hydration, so it never competes with the JavaScript that
 * makes the page interactive.
 *
 * Why a media query in JS rather than `hidden md:block`: an autoplaying <video>
 * is fetched by the browser even when CSS hides it. Tailwind can stop you
 * seeing it; it cannot stop you paying for it. On South African mobile data
 * that download is the difference between a landing page that works and one
 * that appears broken. The element has to genuinely not exist.
 *
 * The poster image underneath is what mobile gets, and what everyone sees
 * until the video has enough data to paint.
 */
export function HeroVideo() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')

    // Respect a user who has asked for less motion — they get the still.
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const update = () => setShow(query.matches && !motion.matches)
    update()

    query.addEventListener('change', update)
    motion.addEventListener('change', update)
    return () => {
      query.removeEventListener('change', update)
      motion.removeEventListener('change', update)
    }
  }, [])

  if (!show) return null

  return (
    <video
      autoPlay
      muted
      loop
      playsInline
      poster="/hero-poster.jpg"
      className="absolute inset-0 w-full h-full object-cover"
    >
      <source src="/hero.mp4" type="video/mp4" />
    </video>
  )
}
