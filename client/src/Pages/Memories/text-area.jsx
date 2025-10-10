import { useState, useRef  } from "react";
import httpClient from "../../utils/http";
import getCaretCoordinates from "textarea-caret";

export default function MentionTextarea({ value, setValue }) {
  const textareaRef = useRef(null); // <-- ref for the textarea

  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [trigger, setTrigger] = useState(null); // '@' or '#'

  const handleChange = async (e) => {
    const newValue = e.target.value;
    setValue(newValue);

    const textarea = e.target;
    const position = textarea.selectionStart;
    const { top, left } = getCaretCoordinates(textarea, position);
    setCoords({ top: top + 20, left: left }); // adjust as needed

    // detect last @ or # word
    const mentionMatch = newValue.match(/@(\w*)$/);
    const hashtagMatch = newValue.match(/#(\w*)$/);
    const placeMatch = newValue.match(/&(\w*)$/);


    if (mentionMatch) {
      const query = mentionMatch[1];
      setTrigger("@");
      if (query.length > 1) fetchSuggestions(query, "@");
      else setSuggestions([]);
    } else if (hashtagMatch) {
      const query = hashtagMatch[1];
      setTrigger("#");
      if (query.length > 1) fetchSuggestions(query, "#"); // hashtags can be shorter
      else setSuggestions([]);
    } else if (placeMatch) {
      const query = placeMatch[1];
      setTrigger("&");
      if (query.length > 1) fetchSuggestions(query, "&"); // places can be short
      else setSuggestions([]);
    }   else {
      setTrigger(null);
      setSuggestions([]);
    }
  };

  const fetchSuggestions = async (query, type) => {
    try {

      const obj = {
        "@": `/person/?text=${query}&page=1&limit=5`,
        "#": `/tag/?text=${query}&page=1&limit=5`,
        "&": `/place/?text=${query}&page=1&limit=5`,
      }
      const url = obj[type]
      console.log("url is : ", url)
      const resp = await httpClient.get(url);
      if (resp.status === 200) {
        setSuggestions(resp.data || []);
        setActiveIndex(0);
      }
    } catch (err) {
      console.error(err);
      setSuggestions([]);
    }
  };

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = suggestions[activeIndex];

      if (trigger === "@") {
        setValue(prev => prev.replace(/@\w*$/, `@${chosen.name} `));
      } else if (trigger === "#") {
        setValue(prev => prev.replace(/#\w*$/, `${chosen.name} `));
      } else if (trigger === "&") {
        setValue(prev => prev.replace(/&\w*$/, `${chosen.name} `));
      }

      setSuggestions([]);
      setTrigger(null);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={textareaRef}         // attach ref here
        rows={10}
        cols={120}
        style={{ maxWidth: "92%" }}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
        className="g-inp"
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
              onClick={(e) => {

                const chosen = s;

                if (trigger === "@") {
                  setValue(prev => prev.replace(/@\w*$/, `@${chosen.name} `));
                } else if (trigger === "#") {
                  setValue(prev => prev.replace(/#\w*$/, `${chosen.name} `));
                } else if (trigger === "&") {
                  setValue(prev => prev.replace(/&\w*$/, `${chosen.name} `));
                }

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
