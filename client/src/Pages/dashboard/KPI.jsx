export default ({ data }) => {
	function calculateDailyStats(data) {
		if (!Array.isArray(data) || data.length === 0) {
			return {
				stdv: 0,
				total: 0,
				average: 0,
				median: 0,
				maxTotal: 0, // highest day amount
				maxDay: {
					total: 0,
				}, // the day/date of highest total
				minTotal: 0, // lowest day amount
				minDay: {
					total: 0,
				}, // the day/date of lowest total
			};
		}

		// extract totals
		const totals = data.map(d => d.total);

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
		let maxDay = data[0];
		let minDay = data[0];
		for (const d of data) {
			if (d.total > maxDay.total) maxDay = d;
			if (d.total < minDay.total) minDay = d;
		}
		const variance =
			data.reduce((acc, cur) => {
				return acc + Math.pow(cur.total - average, 2);
			}, 0) / data.length;
		const stdv = Math.sqrt(variance);

		return {
			total: sum,
			average,
			stdv,
			median,
			maxTotal: maxDay.total, // highest day amount
			maxDay, // the day/date of highest total
			minTotal: minDay.total, // lowest day amount
			minDay, // the day/date of lowest total
		};
	}

	const stats = calculateDailyStats(data);
	return (
		<div className="kpi-container">
			<div className="kpi-card">
				{' '}
				<span className="kpi-title"> Total : </span>{' '}
				<span className="kpi-value">
					{' '}
					{stats.total.toLocaleString('en-US')}{' '}
				</span>
				<div className="tooltip"> Sum of Expenses </div>
			</div>
			<div className="kpi-card">
				{' '}
				<span className="kpi-title"> Mean : </span>{' '}
				<span className="kpi-value">
					{' '}
					{stats.average.toLocaleString('en-US')}{' '}
				</span>
				<div className="tooltip"> Daily Expense Mean </div>
			</div>
			<div className="kpi-card">
				{' '}
				<span className="kpi-title"> Median : </span>{' '}
				<span className="kpi-value">
					{' '}
					{stats.median.toLocaleString('en-US')}{' '}
				</span>
				<div className="tooltip"> Daily Expense Median </div>
			</div>
			<div className="kpi-card">
				{' '}
				<span className="kpi-title"> STDV : </span>{' '}
				<span className="kpi-value">
					{' '}
					{stats.stdv.toLocaleString('en-US')}{' '}
				</span>
				<div className="tooltip"> Standard Deviation </div>
			</div>
			<div className="kpi-card">
				{' '}
				<span className="kpi-title"> Max DT : </span>{' '}
				<span className="kpi-value">
					{' '}
					{stats.maxDay?.total.toLocaleString('en-US')}{' '}
				</span>
				<div className="tooltip">
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
				<div className="tooltip">
					{' '}
					Min Day Total <br /> {stats.minDay.date}{' '}
				</div>
			</div>
		</div>
	);
};
