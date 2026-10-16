import { useState, useEffect, useRef } from "react";

// Errors and offers to undo stay up long enough to read and act on.
const LONG_DURATION = 6000;

export function useFlash(duration = 3200) {
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState(false);
  const [noteAction, setNoteAction] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function clear() {
    clearTimeout(timerRef.current);
    setNote("");
    setNoteAction(null);
  }

  // `action` is { label, run }, shown as a button beside the message (e.g. UNDO).
  function flash(msg, err, action) {
    setNote(msg);
    setNoteErr(!!err);
    setNoteAction(action || null);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(clear, err || action ? LONG_DURATION : duration);
  }

  function runAction() {
    const action = noteAction;
    clear();
    if (action) action.run();
  }

  return { note, noteErr, noteAction, flash, runAction };
}
