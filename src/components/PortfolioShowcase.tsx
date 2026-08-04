'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'

type Work = {
  name: string
  domain: string
  url: string
  image: string
}

const WORKS: Work[] = [
  { name: 'AAMIHE', domain: 'aamihe.vercel.app', url: 'https://aamihe.vercel.app', image: '/assets/portfolio/aamihe.jpg' },
  { name: 'Osher Collective', domain: 'oshercollective.com', url: 'https://oshercollective.com', image: '/assets/portfolio/oshercollective.jpg' },
  { name: 'ML Trade Mark', domain: 'mltmark.com', url: 'https://mltmark.com', image: '/assets/portfolio/mltmark.jpg' },
]

const AUTOPLAY_MS = 4500

export default function PortfolioShowcase() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % WORKS.length)
  }, [])

  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(next, AUTOPLAY_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [next, paused])

  const active = WORKS[index]

  return (
    <div
      className="w-full max-w-2xl mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <a
        href={active.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ver site ${active.name}`}
        className="group relative block rounded-xl overflow-hidden border border-white/15 bg-zinc-950 shadow-2xl shadow-black/40 transition-transform duration-300 hover:-translate-y-1"
      >
        <div className="relative aspect-[16/10]">
          {WORKS.map((w, i) => (
            <Image
              key={w.domain}
              src={w.image}
              alt={`Website ${w.name}`}
              fill
              sizes="(min-width: 1024px) 600px, 90vw"
              className={`object-cover object-top transition-opacity duration-500 ${i === index ? 'opacity-100' : 'opacity-0'}`}
              priority={i === 0}
            />
          ))}
        </div>

        <span className="absolute inset-x-0 bottom-0 px-3.5 py-2.5 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-sm font-bold text-white">{active.name}</span>
          <span className="text-xs font-medium text-white inline-flex items-center gap-1">
            Ver site <ExternalLink className="w-3.5 h-3.5" />
          </span>
        </span>
      </a>

      <div className="flex justify-center gap-2 mt-4">
        {WORKS.map((w, i) => (
          <button
            key={w.domain}
            type="button"
            aria-label={`Ver ${w.name}`}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition-all ${
              i === index ? 'w-6 bg-red-500' : 'w-2 bg-white/25'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
