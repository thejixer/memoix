import { useEffect, useState } from 'react';
import LineChart from './line-chart';
import BarChart from './bar-chart';
import DatePicker from 'react-datepicker';
import { formatDateTime, getLastSaturday } from '../../utils/date';
import toastMaker from '../../utils/custom-toast';
import httpClient from '../../utils/http';
export default () => {
	const [since, setSince] = useState(getLastSaturday());
	const [until, setUntil] = useState(new Date());
	const [dailyExpenses, setDailyExpenses] = useState([]);
	const [expensesByTags, setExpensesByTags] = useState([]);

	function calculateDailyStats(dailyExpenses) {
		if (!Array.isArray(dailyExpenses) || dailyExpenses.length === 0) {
			return {
				total: 0,
				average: 0,
				median: 0,
				maxTotal: null, // highest day amount
				maxDay: 0, // the day/date of highest total
				minTotal: null, // lowest day amount
				minDay: 0, // the day/date of lowest total
			};
		}

		// extract totals
		const totals = dailyExpenses.map(d => d.total);

		// calculate average
		const sum = totals.reduce((a, b) => a + b, 0);
		const average = Number((sum / totals.length).toFixed(3));

		// calculate median
		const sorted = [...totals].sort((a, b) => a - b);
		let median;
		const mid = Math.floor(sorted.length / 2);
		if (sorted.length % 2 === 0) {
			median = (sorted[mid - 1] + sorted[mid]) / 2;
		} else {
			median = sorted[mid];
		}

		// highest day
		let maxDay = dailyExpenses[0];
		let minDay = dailyExpenses[0];
		for (const d of dailyExpenses) {
			if (d.total > maxDay.total) maxDay = d;
			if (d.total < minDay.total) minDay = d;
		}

		return {
			total: sum,
			average,
			median,
			maxTotal: maxDay.total, // highest day amount
			maxDay, // the day/date of highest total
			minTotal: minDay.total, // lowest day amount
			minDay, // the day/date of lowest total
		};
	}

	const createURLSearchParams = (since, until) => {
		const params = new URLSearchParams();
		if (since && since instanceof Date) {
			const startOfDay = new Date(since);
			startOfDay.setHours(0, 0, 0, 0);
			params.append('since', startOfDay.toISOString());
		}
		if (until && until instanceof Date) {
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
		const startDate = dateOnly(new Date(since));

		const endDate = dateOnly(new Date(until));
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

	const stats = calculateDailyStats(dailyExpenses);

	if (!stats || !stats.maxDay || !stats.minDay) return;

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

			<div className="kpi-container">
				<div className="kpi-card">
					{' '}
					<span className="kpi-title"> Total : </span>{' '}
					<span className="kpi-value">
						{' '}
						{stats.total.toLocaleString('en-US')}{' '}
					</span>
					<div class="tooltip"> Sum of Expenses </div>
				</div>
				<div className="kpi-card">
					{' '}
					<span className="kpi-title"> ADE : </span>{' '}
					<span className="kpi-value">
						{' '}
						{stats.average.toLocaleString('en-US')}{' '}
					</span>
					<div class="tooltip"> Average Daily Expense </div>
				</div>
				<div className="kpi-card">
					{' '}
					<span className="kpi-title"> MDE : </span>{' '}
					<span className="kpi-value">
						{' '}
						{stats.median.toLocaleString('en-US')}{' '}
					</span>
					<div class="tooltip"> Median Daily Expense </div>
				</div>
				<div className="kpi-card">
					{' '}
					<span className="kpi-title"> Max DT : </span>{' '}
					<span className="kpi-value">
						{' '}
						{stats.maxDay.total.toLocaleString('en-US')}{' '}
					</span>
					<div class="tooltip">
						{' '}
						Max Day Total <br /> {stats.maxDay.date}{' '}
					</div>
				</div>
				<div className="kpi-card">
					{' '}
					<span className="kpi-title"> Min DT : </span>{' '}
					<span className="kpi-value">
						{' '}
						{stats.minDay.total.toLocaleString('en-US')}{' '}
					</span>
					<div class="tooltip">
						{' '}
						Min Day Total <br /> {stats.minDay.date}{' '}
					</div>
				</div>
			</div>
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
