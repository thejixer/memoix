import { useState, useEffect, useRef } from 'react';
import httpClient from '../../utils/http';

function useDebounce(callback, delay) {
	const timeoutRef = useRef(null);
	const debounced = (...args) => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
		timeoutRef.current = setTimeout(() => callback(...args), delay);
	};
	useEffect(() => () => clearTimeout(timeoutRef.current), []);
	return debounced;
}

export default function MentionInput({
	value,
	setValue,
	placeholder = 'Search with #hashtags or @mentions or &places',
	fetchAll,
	since,
	until,
}) {
	const [suggestions, setSuggestions] = useState([]);
	const [activeIndex, setActiveIndex] = useState(0);
	const [trigger, setTrigger] = useState(null);
	const inputRef = useRef(null);

	const fetchSuggestions = useDebounce(async (query, type) => {
		if (!query || !type) return setSuggestions([]);
		try {
			const urlMap = {
				'@': `/person/?text=${query}&page=1&limit=5`,
				'#': `/tag/?text=${query}&page=1&limit=5`,
				'&': `/place/?text=${query}&page=1&limit=5`,
			};
			const resp = await httpClient.get(urlMap[type]);
			if (resp.status === 200) setSuggestions(resp.data || []);
		} catch {
			setSuggestions([]);
		}
	}, 300);

	useEffect(() => {
		const mentionMatch = value.match(/@(\w*)$/);
		const hashtagMatch = value.match(/#(\w*)$/);
		const placeMatch = value.match(/&(\w*)$/);

		if (mentionMatch) setTrigger('@') || fetchSuggestions(mentionMatch[1], '@');
		else if (hashtagMatch)
			setTrigger('#') || fetchSuggestions(hashtagMatch[1], '#');
		else if (placeMatch)
			setTrigger('&') || fetchSuggestions(placeMatch[1], '&');
		else {
			setTrigger(null);
			setSuggestions([]);
		}
	}, [value]);

	const handleKeyDown = e => {
		if (e.key === 'ArrowDown' && suggestions.length) {
			e.preventDefault();
			setActiveIndex(i => (i + 1) % suggestions.length);
		} else if (e.key === 'ArrowUp' && suggestions.length) {
			e.preventDefault();
			setActiveIndex(i => (i - 1 + suggestions.length) % suggestions.length);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (suggestions.length) {
				handleSelect(suggestions[activeIndex]);
			} else {
				fetchAll(value, since, until);
			}
		}
	};

	const handleSelect = item => {
		if (!trigger) return;
		if (trigger === '@')
			setValue(prev => prev.replace(/@\w*$/, `@${item.name} `));
		if (trigger === '#')
			setValue(prev => prev.replace(/#\w*$/, `${item.name} `));
		if (trigger === '&')
			setValue(prev => prev.replace(/&\w*$/, `${item.name} `));
		setSuggestions([]);
		setTrigger(null);
		setActiveIndex(0);
		inputRef.current?.focus();
	};

	return (
		<div
			style={{
				position: 'relative',
				display: 'inline-block',
				width: '350px',
				margin: 1,
			}}
		>
			<input
				className="g-inp"
				ref={inputRef}
				type="text"
				value={value}
				onChange={e => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				style={{
					width: '350px',
					margin: 1,
				}}
			/>

			{suggestions.length > 0 && (
				<ul
					style={{
						position: 'absolute',
						top: '100%', // directly under input
						left: 0,
						right: 0,
						zIndex: 1000,
						backgroundColor: '#000',
						color: '#fff',
						borderRadius: '4px',
						maxHeight: '200px',
						overflowY: 'auto',
						margin: 0,
						padding: 0,
						listStyle: 'none',
					}}
				>
					{suggestions.map((s, i) => (
						<li
							key={s.id ?? s.name}
							style={{
								padding: '8px',
								cursor: 'pointer',
								backgroundColor: i === activeIndex ? '#1e90ff' : 'transparent',
								fontWeight: i === activeIndex ? 'bold' : 'normal',
								color: '#33ff33',
							}}
							onClick={() => handleSelect(s)}
						>
							{s.name}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
