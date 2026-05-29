import { Loader2, Mic, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { suggestions as loadSuggestions } from "../api/client.js";
import { useDebounce } from "../hooks/useDebounce.js";

export default function SearchBox({ initialValue = "", onSearch, loading = false, compact = false }) {
  const [value, setValue] = useState(initialValue);
  const [items, setItems] = useState([]);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const rootRef = useRef(null);
  const debounced = useDebounce(value, 220);

  useEffect(() => setValue(initialValue), [initialValue]);

  useEffect(() => {
    let active = true;
    if (!debounced.trim()) {
      setItems([]);
      return undefined;
    }
    loadSuggestions(debounced)
      .then((next) => active && setItems(next))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, [debounced]);

  useEffect(() => {
    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setItems([]);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function submit(event) {
    event.preventDefault();
    setItems([]);
    if (value.trim()) onSearch(value.trim());
  }

  function selectSuggestion(item) {
    setValue(item);
    setItems([]);
    onSearch(item);
  }

  function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice search is not supported in this browser.");
      return;
    }
    setVoiceError("");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onerror = () => {
      setListening(false);
      setVoiceError("Microphone permission was blocked or unavailable.");
    };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ").trim();
      setValue(transcript);
      if (event.results[event.results.length - 1].isFinal && transcript) {
        onSearch(transcript);
      }
    };
    recognition.start();
  }

  return (
    <form ref={rootRef} onSubmit={submit} className="relative w-full">
      <div className={`flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 shadow-glow transition focus-within:border-blue-500 dark:border-slate-800 dark:bg-slate-900 ${compact ? "h-12" : "h-16"}`}>
        <Search className="text-slate-400" size={22} />
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
          placeholder="Search the distributed web index"
          aria-label="Search query"
        />
        <button type="button" onClick={startVoiceSearch} className={`grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 ${listening ? "bg-red-50 text-red-600 dark:bg-red-950" : ""}`} aria-label="Voice search" title="Voice search">
          <Mic size={19} />
        </button>
        <button className="inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={17} /> : <Search size={17} />} Search
        </button>
      </div>
      {items.length > 0 && (
        <div className="absolute left-4 right-4 top-full z-20 mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
          {items.map((item) => (
          <button key={item} type="button" onClick={() => selectSuggestion(item)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              <Search size={16} className="text-slate-400" /> {item}
            </button>
          ))}
        </div>
      )}
      {voiceError && <p className="mt-2 px-4 text-sm text-red-600 dark:text-red-300">{voiceError}</p>}
    </form>
  );
}
