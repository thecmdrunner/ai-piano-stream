'use client'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useCallback, useEffect, useRef, useState } from 'react'

const NOTES = [
  { note: 'C', key: 'a', frequency: 261.63, type: 'white' },
  { note: 'C#', key: 'w', frequency: 277.18, type: 'black' },
  { note: 'D', key: 's', frequency: 293.66, type: 'white' },
  { note: 'D#', key: 'e', frequency: 311.13, type: 'black' },
  { note: 'E', key: 'd', frequency: 329.63, type: 'white' },
  { note: 'F', key: 'f', frequency: 349.23, type: 'white' },
  { note: 'F#', key: 't', frequency: 369.99, type: 'black' },
  { note: 'G', key: 'g', frequency: 392.00, type: 'white' },
  { note: 'G#', key: 'y', frequency: 415.30, type: 'black' },
  { note: 'A', key: 'h', frequency: 440.00, type: 'white' },
  { note: 'A#', key: 'u', frequency: 466.16, type: 'black' },
  { note: 'B', key: 'j', frequency: 493.88, type: 'white' },
  { note: 'C5', key: 'k', frequency: 523.25, type: 'white' },
]

const WHITE_KEYS = NOTES.filter(n => n.type === 'white').map(n => n.key)

const BLACK_KEYS = NOTES.filter(n => n.type === 'black').map(n => n.key)


type NoteSequence = Array<{ note: string; durationInMs: number }>

export default function PianoApp() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set())
  const stopFunctionsRef = useRef<{ [key: string]: () => void }>({})
  const [sequence, setSequence] = useState<string>('[]')
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)()
    setAudioContext(context)

    return () => {
      context.close()
    }
  }, [])

  const play = useCallback((note: string, durationInMs: number = 500) => {
    if (audioContext) {
      const noteObj = NOTES.find(n => n.note === note || n.key === note.toLowerCase())
      if (!noteObj) return () => { }

      const oscillator = audioContext.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(noteObj.frequency, audioContext.currentTime)

      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.start()
      setActiveNotes(prev => new Set(prev).add(noteObj.key))

      const stopNote = () => {
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1)
        setTimeout(() => {
          oscillator.stop()
          setActiveNotes(prev => {
            const newSet = new Set(prev)
            newSet.delete(noteObj.key)
            return newSet
          })
        }, 100)
      }

      stopFunctionsRef.current[noteObj.key] = stopNote
      setTimeout(stopNote, durationInMs)

      return stopNote
    }
    return () => { }
  }, [audioContext])

  const stopNote = useCallback((note: string) => {
    const stopFunction = stopFunctionsRef.current[note]
    if (stopFunction) {
      stopFunction()
      delete stopFunctionsRef.current[note]
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const note = event.key.toLowerCase()
      const noteObj = NOTES.find(n => n.key === note)
      if (noteObj) {
        play(note)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const note = event.key.toLowerCase()
      const noteObj = NOTES.find(n => n.key === note)
      if (noteObj) {
        stopNote(note)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [play, stopNote])

  const playSequence = useCallback(async () => {
    if (isPlaying) return

    setIsPlaying(true)
    try {
      const noteSequence: NoteSequence = JSON.parse(sequence)
      for (const { note, durationInMs } of noteSequence) {
        await new Promise<void>((resolve) => {
          play(note, durationInMs)
          setTimeout(resolve, durationInMs)
        })
      }
    } catch (error) {
      console.error('Error playing sequence:', error)
    }
    setIsPlaying(false)
  }, [sequence, play, isPlaying])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6">Piano App</h1>
      <div className="relative inline-flex bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
        {NOTES.map(({ note, key, type }, index) => (
          <Button
            key={key}
            className={`
              ${type === 'white' ? 'bg-white text-black w-12 h-48' : 'bg-black text-white w-8 h-32 absolute z-10'}
              ${type === 'black' ? `ml-[-${((index + 1) % 2) + 1}rem]` : ''}
              ${activeNotes.has(key) ? 'opacity-75' : ''}
              border border-gray-300 rounded-b-md flex flex-col justify-end items-center pb-2
            `}
            style={{ marginLeft: type === 'black' ? '-1rem' : '0' }}
            onMouseDown={() => play(key)}
            onMouseUp={() => stopNote(key)}
            onMouseLeave={() => stopNote(key)}
          >
            <span className="text-xs font-semibold">{note}</span>
            <span className="text-xs opacity-50">{key.toUpperCase()}</span>
          </Button>
        ))}
      </div>
      <div className="w-full max-w-md space-y-4">
        <Textarea
          value={sequence}
          onChange={(e) => setSequence(e.target.value)}
          placeholder="Enter note sequence as JSON array"
          className="h-32"
        />
        <Button onClick={playSequence} disabled={isPlaying} className="w-full">
          {isPlaying ? 'Playing...' : 'Play Sequence'}
        </Button>
      </div>
      <p className="mt-6 text-gray-600">Press the corresponding keys on your keyboard to play notes!</p>
    </div>
  )
}