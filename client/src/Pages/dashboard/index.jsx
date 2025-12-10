import { useEffect, useState } from 'react';
import LineChart from './line-chart';
import BarChart from './bar-chart';
import DatePicker from 'react-datepicker';
import { formatDateTime, getLastSaturday } from '../../utils/date';
import toastMaker from '../../utils/custom-toast';
import httpClient from '../../utils/http';
import KPI from './KPI';
export default () => {
	const [since, setSince] = useState(getLastSaturday());
	const [until, setUntil] = useState(new Date());
	const [dailyExpenses, setDailyExpenses] = useState([]);
	const [expensesByTags, setExpensesByTags] = useState([]);

	const createURLSearchParams = (since, until) => {
		const params = new URLSearchParams();

		// Swap if since is after until
		if (since && until && since > until) {
			[since, until] = [until, since];
		}

		if (since instanceof Date) {
			const startOfDay = new Date(since);
			startOfDay.setHours(0, 0, 0, 0);
			params.append('since', startOfDay.toISOString());
		}

		if (until instanceof Date) {
			const endOfDay = new Date(until);
			endOfDay.setHours(23, 59, 59, 999);
			params.append('until', endOfDay.toISOString());
		}

		return params;
	};

	const formatLocalDateKey = d => {
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	};

	const dateOnly = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

	const processRawDailyExpenses = rawData => {
		let s = new Date(since);
		let u = new Date(until);
		if (s && u && s > u) {
			[s, u] = [u, s];
		}

		const startDate = dateOnly(new Date(s));

		const endDate = dateOnly(new Date(u));
		const expenseMap = new Map();

		rawData.forEach(item => {
			const itemDate = new Date(item.date);
			if (isNaN(itemDate)) return;
			const itemDateOnly = dateOnly(itemDate);

			if (itemDateOnly < startDate || itemDateOnly > endDate) return;
			const key = formatLocalDateKey(itemDateOnly);

			expenseMap.set(key, item.total);
		});

		const filled = [];
		for (
			let d = new Date(startDate);
			d <= endDate;
			d.setDate(d.getDate() + 1)
		) {
			const key = formatLocalDateKey(d);

			filled.push({
				date: key,
				total: expenseMap.get(key) || 0,
			});
		}

		const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

		return filled.map(item => {
			const [y, m, day] = item.date.split('-').map(Number);
			const dateObj = new Date(y, m - 1, day);
			return {
				...item,
				day: weekdays[dateObj.getDay()],
			};
		});
	};

	const fetchDailyExpenses = async () => {
		const params = createURLSearchParams(since, until);

		const resp = await httpClient.get(`/expense/daily?${params.toString()}`);
		if (resp.status == 200 && resp.data) {
			const d = processRawDailyExpenses(resp.data);

			return setDailyExpenses(d);
		}
		if (resp.status == 400) {
			toastMaker.error('date range is not valid');
		}
		setDailyExpenses([]);
	};
	const fetchAggregatedExpensesByTags = async () => {
		const params = createURLSearchParams(since, until);

		const resp = await httpClient.get(`/expense/by-tag?${params.toString()}`);
		if (resp.status == 200 && resp.data) {
			return setExpensesByTags(resp.data);
		}
		if (resp.status == 400) {
			toastMaker.error('date range is not valid');
		}
		setExpensesByTags([]);
	};

	useEffect(() => {
		fetchDailyExpenses();
		fetchAggregatedExpensesByTags();
	}, [until, since]);

	return (
		<div className="cg">
			<div
				className="date-range"
				style={{ padding: '4px 8px', borderBottom: '1px solid #33ff33' }}
			>
				<label>since</label>
				<DatePicker
					selected={since}
					onChange={date => setSince(date)}
					calendarClassName="evil-terminal-calendar"
					dayClassName={() => 'evil-terminal-day'}
					customInput={
						<button className="g-btn" style={{ display: 'inline !important' }}>
							{' '}
							{since ? formatDateTime(since) : 'no date specified'}{' '}
						</button>
					}
				/>
				<label>until</label>
				<DatePicker
					selected={until}
					onChange={date => setUntil(date)}
					calendarClassName="evil-terminal-calendar"
					dayClassName={() => 'evil-terminal-day'}
					customInput={
						<button className="g-btn" style={{ display: 'inline !important' }}>
							{' '}
							{until ? formatDateTime(until) : 'no date specified'}{' '}
						</button>
					}
				/>
			</div>
			<KPI data={dailyExpenses} />
			<div
				style={{
					display: 'flex',
					width: '100%',
					padding: '8px 12px',
					marginBottom: 32,
				}}
			>
				<BarChart data={expensesByTags} />
				<LineChart data={dailyExpenses} />
			</div>
		</div>
	);
};
