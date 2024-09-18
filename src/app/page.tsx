"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useEffect, useRef, useState } from "react";

const NOTES = [
  { note: "C", key: "a", frequency: 261.63, type: "white" },
  { note: "C#", key: "w", frequency: 277.18, type: "black" },
  { note: "D", key: "s", frequency: 293.66, type: "white" },
  { note: "D#", key: "e", frequency: 311.13, type: "black" },
  { note: "E", key: "d", frequency: 329.63, type: "white" },
  { note: "F", key: "f", frequency: 349.23, type: "white" },
  { note: "F#", key: "t", frequency: 369.99, type: "black" },
  { note: "G", key: "g", frequency: 392.0, type: "white" },
  { note: "G#", key: "y", frequency: 415.3, type: "black" },
  { note: "A", key: "h", frequency: 440.0, type: "white" },
  { note: "A#", key: "u", frequency: 466.16, type: "black" },
  { note: "B", key: "j", frequency: 493.88, type: "white" },
  { note: "C5", key: "k", frequency: 523.25, type: "white" },
];

const WHITE_KEYS = NOTES.filter((n) => n.type === "white").map((n) => n.key);

const BLACK_KEYS = NOTES.filter((n) => n.type === "black").map((n) => n.key);

type NoteSequence = Array<{ note: string; durationInMs: number }>;

export default function PianoApp() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const stopFunctionsRef = useRef<Record<string, () => void>>({});
  const [sequence, setSequence] = useState<string>(
    JSON.stringify([
      { note: "C", durationInMs: 250 },
      { note: "C", durationInMs: 250 },
      { note: "D", durationInMs: 500 },
      { note: "C", durationInMs: 500 },
      { note: "F", durationInMs: 500 },
      { note: "E", durationInMs: 1000 },
      { note: "C", durationInMs: 250 },
      { note: "C", durationInMs: 250 },
      { note: "D", durationInMs: 500 },
      { note: "C", durationInMs: 500 },
      { note: "G", durationInMs: 500 },
      { note: "F", durationInMs: 1000 },
      { note: "C", durationInMs: 250 },
      { note: "C", durationInMs: 250 },
      { note: "C5", durationInMs: 500 },
      { note: "A", durationInMs: 500 },
      { note: "F", durationInMs: 500 },
      { note: "E", durationInMs: 500 },
      { note: "D", durationInMs: 1000 },
      { note: "A#", durationInMs: 250 },
      { note: "A#", durationInMs: 250 },
      { note: "A", durationInMs: 500 },
      { note: "F", durationInMs: 500 },
      { note: "G", durationInMs: 500 },
      { note: "F", durationInMs: 1000 },
    ]),
  );
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const context = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    setAudioContext(context);

    return () => {
      void context.close();
    };
  }, []);

  const play = useCallback(
    (note: string, durationInMs = 500) => {
      if (audioContext) {
        const noteObj = NOTES.find(
          (n) => n.note === note || n.key === note.toLowerCase(),
        );
        if (!noteObj)
          return () => {
            //
          };

        const oscillator = audioContext.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(
          noteObj.frequency,
          audioContext.currentTime,
        );

        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        setActiveNotes((prev) => new Set(prev).add(noteObj.key));

        const stopNote = () => {
          gainNode.gain.exponentialRampToValueAtTime(
            0.00001,
            audioContext.currentTime + 0.1,
          );
          setTimeout(() => {
            oscillator.stop();
            setActiveNotes((prev) => {
              const newSet = new Set(prev);
              newSet.delete(noteObj.key);
              return newSet;
            });
          }, 100);
        };

        stopFunctionsRef.current[noteObj.key] = stopNote;
        setTimeout(stopNote, durationInMs);

        return stopNote;
      }
      return () => {
        //
      };
    },
    [audioContext],
  );

  const stopNote = useCallback((note: string) => {
    const stopFunction = stopFunctionsRef.current[note];
    if (stopFunction) {
      stopFunction();
      delete stopFunctionsRef.current[note];
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const note = event.key.toLowerCase();
      const noteObj = NOTES.find((n) => n.key === note);
      if (noteObj) {
        play(note);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const note = event.key.toLowerCase();
      const noteObj = NOTES.find((n) => n.key === note);
      if (noteObj) {
        stopNote(note);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [play, stopNote]);

  const playSequence = useCallback(async () => {
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      const noteSequence: NoteSequence = JSON.parse(sequence) as NoteSequence;
      for (const { note, durationInMs } of noteSequence) {
        await new Promise<void>((resolve) => {
          play(note, durationInMs);
          setTimeout(resolve, durationInMs);
        });
      }
    } catch (error) {
      console.error("Error playing sequence:", error);
    }
    setIsPlaying(false);
  }, [sequence, play, isPlaying]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="mb-6 text-3xl font-bold">Piano App</h1>
      <div className="relative mb-6 inline-flex rounded-lg bg-gray-800 p-4 shadow-lg">
        {NOTES.map(({ note, key, type }, index) => (
          <Button
            key={key}
            className={` ${type === "white" ? "h-48 w-12 bg-white text-black" : "absolute z-10 h-32 w-8 bg-black text-white"} ${type === "black" ? `ml-[-${((index + 1) % 2) + 1}rem]` : ""} ${activeNotes.has(key) ? "opacity-75" : ""} flex flex-col items-center justify-end rounded-b-md border border-gray-300 pb-2`}
            style={{ marginLeft: type === "black" ? "-1rem" : "0" }}
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
          onChange={(e) => setSequence(e.currentTarget.value)}
          placeholder="Enter note sequence as JSON array"
          className="h-32"
        />
        <Button onClick={playSequence} disabled={isPlaying} className="w-full">
          {isPlaying ? "Playing..." : "Play Sequence"}
        </Button>
      </div>
      <p className="mt-6 text-gray-600">
        Press the corresponding keys on your keyboard to play notes!
      </p>
    </div>
  );
}
