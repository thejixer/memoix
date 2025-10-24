import { useState } from 'react';
import httpClient from '../../utils/http';
import { useNavigate } from 'react-router';
import toastMaker from '../../utils/custom-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import MentionTextarea from './text-area';
function validateAmount(amount) {
	return /^\d{1,15}(\.\d{1,2})?$/.test(amount);
}
export default () => {
	const navigate = useNavigate();

	const [content, setContent] = useState('');
	const [amount, setAmount] = useState('');
	const [selectedDate, setSelectedDate] = useState(new Date());

	const submit = async () => {
		if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime()))
			return toastMaker.error('time is not valid');

		if (!content) return toastMaker.error('enter content please');
		if (!amount || !validateAmount(amount))
			return toastMaker.error('please enter a valid amount');

		const resp = await httpClient.post('/expense/', {
			content,
			amount: String(amount),
			date: new Date(selectedDate).toISOString(),
		});

		if (resp.status == 200) {
			toastMaker.success('finance created');
			return navigate(0);
		}

		toastMaker.error('something went wrong');
	};

	function formatDateTime(date) {
		if (!(date instanceof Date) || isNaN(date.getTime())) {
			throw new Error('Invalid date');
		}

		const pad = n => n.toString().padStart(2, '0');

		const month = pad(date.getMonth() + 1); // months are 0-based
		const day = pad(date.getDate());
		const year = date.getFullYear();

		const hours = pad(date.getHours());
		const minutes = pad(date.getMinutes());

		return `${month}-${day}-${year} ${hours}:${minutes}`;
	}

	return (
		<div style={{ padding: 8 }}>
			<span className="cg"> amount </span>
			<input
				type="text"
				className="g-inp"
				placeholder="in tomans"
				value={new Intl.NumberFormat('en-US').format(amount)} // 👈 formatted for display
				onChange={e => {
					// strip commas so regex works on the raw number
					const raw = e.target.value.replace(/,/g, '');

					// validate: up to 15 digits + optional . + up to 2 decimals
					if (/^(\d{1,15}(\.\d{0,2})?)?$/.test(raw)) {
						// allow empty string (so user can clear the field)
						if (raw === '') {
							setAmount('');
							return;
						}

						// parse into a number
						const num = Number(raw);
						if (!isNaN(num)) {
							setAmount(num);
						}
					}
				}}
				autoFocus
			/>{' '}
			tomans
			<MentionTextarea value={content} setValue={setContent} />
			<DatePicker
				selected={selectedDate}
				onChange={date => setSelectedDate(date)}
				calendarClassName="evil-terminal-calendar"
				// wrapperClassName="evil-terminal-wrapper"
				dayClassName={() => 'evil-terminal-day'}
				customInput={
					<button className="g-btn"> {formatDateTime(selectedDate)} </button>
				}
				withPortal
				showTimeSelect // 👈 enables the time picker
				timeIntervals={5}
			/>
			<button className="g-btn" onClick={() => submit()}>
				submit
			</button>
		</div>
	);
};
