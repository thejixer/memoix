import { useState, useRef, ChangeEvent, KeyboardEvent, useLayoutEffect } from "react";
import httpClient from "../../libs/api/httpClient";
import { Input } from "../../ui/primitives";

type TriggerType = "@" | "#" | "&" | null;

interface Suggestion {
  id?: string | number;
  name: string;
}

interface MentionTextareaProps {
  value: string;
  setValue: (v: string | ((prev: string) => string)) => void;
}

export default function MentionTextarea({ value, setValue }: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [trigger, setTrigger] = useState<TriggerType>(null);

  // Calculate caret position using mirror div
  const updateCaretPosition = () => {
    const textarea = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!textarea || !mirror) return;

    const selectionStart = textarea.selectionStart;

    const textBeforeCaret = value.slice(0, selectionStart);
    mirror.textContent = textBeforeCaret || " "; // avoid empty content

    const span = document.createElement("span");
    span.textContent = "\u200b"; // zero-width space
    mirror.appendChild(span);

    const rect = span.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();

    setCoords({
      top: rect.top - textareaRect.top + textarea.scrollTop + 20, // add some offset
      left: rect.left - textareaRect.left + textarea.scrollLeft,
    });

    mirror.innerHTML = ""; // reset mirror
  };

  const handleChange = async (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    updateCaretPosition();

    const newValue = e.target.value;

    const mentionMatch = newValue.match(/@(\w*)$/);
    const hashtagMatch = newValue.match(/#(\w*)$/);
    const placeMatch = newValue.match(/&(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setTrigger("@");
      query.length > 1 ? fetchSuggestions(query, "@") : setSuggestions([]);
    } else if (hashtagMatch) {
      const query = hashtagMatch[1];
      setTrigger("#");
      query.length > 1 ? fetchSuggestions(query, "#") : setSuggestions([]);
    } else if (placeMatch) {
      const query = placeMatch[1];
      setTrigger("&");
      query.length > 1 ? fetchSuggestions(query, "&") : setSuggestions([]);
    } else {
      setTrigger(null);
      setSuggestions([]);
    }
  };

  const fetchSuggestions = async (query: string, type: Exclude<TriggerType, null>) => {
    try {
      const urls: Record<Exclude<TriggerType, null>, string> = {
        "@": `/person/?text=${query}&page=1&limit=5`,
        "#": `/tag/?text=${query}&page=1&limit=5`,
        "&": `/place/?text=${query}&page=1&limit=5`,
      };
      const resp = await httpClient.get(urls[type]);
      if (resp.status === 200) {
        setSuggestions(resp.data || []);
        setActiveIndex(0);
      }
    } catch (err) {
      console.error(err);
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = suggestions[activeIndex];
      if (!trigger) return;

      if (trigger === "@") setValue((prev) => prev.replace(/@\w*$/, `@${chosen.name} `));
      else if (trigger === "#") setValue((prev) => prev.replace(/#\w*$/, `${chosen.name} `));
      else if (trigger === "&") setValue((prev) => prev.replace(/&\w*$/, `${chosen.name} `));

      setSuggestions([]);
      setTrigger(null);
    }
  };

  useLayoutEffect(() => {
    updateCaretPosition();
  }, [value]);

  return (
    <div style={{ position: "relative" }}>
      <textarea
      className="g-inp"
        ref={textareaRef}
        rows={10}
        cols={120}
        style={{ maxWidth: "92%" }}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
      />

      {/* Mirror div for caret calculation */}
      <div
        ref={mirrorRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          fontSize: "inherit",
          fontFamily: "inherit",
          lineHeight: "inherit",
        }}
      />

      {suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: coords.top,
            left: coords.left,
            zIndex: 1000,
            backgroundColor: "#000",
            color: "#fff",
            borderRadius: "4px",
            maxHeight: "200px",
            overflowY: "auto",
            minWidth: "150px",
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id ?? s.name}
              style={{
                padding: "8px",
                cursor: "pointer",
                backgroundColor: i === activeIndex ? "#1e90ff" : "transparent",
                fontWeight: i === activeIndex ? "bold" : "normal",
                color: "#33ff33",
              }}
              onClick={() => {
                if (!trigger) return;
                if (trigger === "@") setValue((prev) => prev.replace(/@\w*$/, `@${s.name} `));
                else if (trigger === "#") setValue((prev) => prev.replace(/#\w*$/, `${s.name} `));
                else if (trigger === "&") setValue((prev) => prev.replace(/&\w*$/, `${s.name} `));

                setSuggestions([]);
                setTrigger(null);
                textareaRef.current?.focus();
              }}
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
