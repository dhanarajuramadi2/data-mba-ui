import { useEffect, useId, useRef, useState } from 'react';

// Text input with a suggestion list styled like the rest of the app.
// Replaces <datalist>, whose popup is drawn by the browser (dark, large text,
// and impossible to style). Typing any value is still allowed.
export function ComboBox({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const listId = useId();
  const listRef = useRef(null);

  const query = value.trim().toLowerCase();
  const matches = options.filter((option) => option.toLowerCase().includes(query));
  const showList = open && matches.length > 0;

  useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const choose = (option) => {
    onChange(option);
    setOpen(false);
    setHighlight(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && showList && matches[highlight]) {
      event.preventDefault();
      choose(matches[highlight]);
    } else if (event.key === 'Escape' && showList) {
      // Close only the list, not the surrounding modal
      event.nativeEvent.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="ui-combobox">
      <input
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      <span className="ui-combobox-arrow" aria-hidden="true">▾</span>

      {showList && (
        <ul id={listId} ref={listRef} role="listbox" className="ui-combobox-list">
          {matches.map((option, index) => (
            <li
              key={option}
              role="option"
              aria-selected={option === value}
              className={`${index === highlight ? 'highlighted' : ''} ${option === value ? 'selected' : ''}`}
              // Keep focus in the input, and stop the parent <label> re-opening the list
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setHighlight(index)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
