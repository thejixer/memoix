import { useEffect, useState, useRef } from 'react';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import httpClient from '../../utils/http';
import colors from '../../utils/colors';
const LineChartToolTip = ({ active, payload, label, coordinate, viewBox }) => {
	if (!active || !payload || payload.length === 0) return null;

	const cacheRef = useRef({});

	const tooltipWidth = 400;
	const tooltipHeight = 89;

	// container dimensions
	const chartWidth = viewBox?.width ?? 400;
	const chartHeight = viewBox?.height ?? 400;
	const offsetX = 10;
	const offsetY = 10;

	let left = (coordinate?.x ?? 0) + offsetX;
	let top = (coordinate?.y ?? 0) + offsetY;

	// clamp inside chart container
	if (left + tooltipWidth > chartWidth) {
		left = chartWidth - tooltipWidth - 10; // 10px padding from right
	}
	if (top + tooltipHeight > chartHeight) {
		top = chartHeight - tooltipHeight - 10; // 10px padding from bottom
	}

	// optional: prevent negative position
	left = Math.max(left, 0);
	top = Math.max(top, 0);

	const [topTags, setTopTags] = useState([]);
	const [topMentions, setTopMentions] = useState([]);
	const createURLSearchParams = date => {
		const params = new URLSearchParams();

		// ✅ static mode
		params.append('mode', 'expense');

		if (date) {
			// convert ISO string or Date to Date object
			const d = date instanceof Date ? date : new Date(date);

			const startOfDay = new Date(d);
			startOfDay.setHours(0, 0, 0, 0);
			params.append('since', startOfDay.toISOString());

			const endOfDay = new Date(d);
			endOfDay.setHours(23, 59, 59, 999);
			params.append('until', endOfDay.toISOString());
		}

		return params;
	};
	const fetchTopTags = async l => {
		try {
			const d = new Date(l).toISOString();
			const key = new Date(d).toISOString().slice(0, 10);
			if (cacheRef.current[key]?.tags) {
				setTopTags(cacheRef.current[key].tags);
				return;
			}

			const params = createURLSearchParams(d);
			const resp = await httpClient.get(`/tag/top-tags?${params.toString()}`);
			if (resp.status == 200) {
				console.log('in line chart : ', resp.data);
				setTopTags(resp.data || []);
				cacheRef.current[key] = {
					...cacheRef.current[key],
					tags: resp.data || [],
				};
				return;
			}
			throw new Error('');
		} catch {
			setTopTags([]);
		}
	};

	const fetchTopMentions = async l => {
		try {
			const d = new Date(l).toISOString();
			const key = new Date(d).toISOString().slice(0, 10);

			if (cacheRef.current[key]?.mentions) {
				setTopMentions(cacheRef.current[key].mentions);
				return;
			}
			const params = createURLSearchParams(d);
			const resp = await httpClient.get(
				`/mention/top-mentions?${params.toString()}`
			);
			if (resp.status == 200) {
				setTopMentions(resp.data || []);
				cacheRef.current[key] = {
					...cacheRef.current[key],
					mentions: resp.data || [],
				};

				return;
			}
			throw new Error('');
		} catch (error) {
			setTopMentions([]);
		}
	};
	useEffect(() => {
		(async function name() {
			await Promise.all([fetchTopTags(label), fetchTopMentions(label)]);
		})();
	}, [label]);

	const data = payload[0].payload;

	return (
		<div
			style={{
				position: 'absolute',
				left,
				top,
				background: '#000',
				color: '#33ff33',
				padding: 8,
				border: '1px solid #33ff33',
				width: tooltipWidth,
				height: tooltipHeight,
				maxWidth: tooltipWidth,
				maxHeight: tooltipHeight,
				overflowY: 'auto',
				fontSize: 12,
			}}
		>
			<div style={{ padding: '0 4px', marginBottom: 4 }}>
				Total:{' '}
				<span style={{ fontWeight: 'bold' }}>
					{data.total.toLocaleString()}{' '}
				</span>{' '}
				|{' '}
				<span style={{ fontWeight: 'bold' }}>
					{data.day}-{data.date}
				</span>
			</div>

			<div style={{ minHeight: 50 }}>
				<div style={{ padding: '0 4px', marginBottom: 4 }}>
					{topTags.length ? (
						topTags.map((tag, index, arr) => {
							return (
								<span key={index}>
									<span
										style={{
											color: colors[index % colors.length],
											cursor: 'pointer',
										}}
										onClick={() => {
											const newValue = query + ' ' + tag.name + ' ';
											setQuery(newValue);
											fetchAll(newValue, since, until);
										}}
									>
										{' '}
										{tag.name} ({tag.usage_count}){' '}
									</span>
								</span>
							);
						})
					) : (
						<span className="cg"> no avalible tags</span>
					)}
				</div>
				<div style={{ padding: '0 8px' }}>
					{topMentions.length ? (
						topMentions.map((mention, index, arr) => {
							return (
								<span key={index}>
									<span
										style={{
											color: colors[(index + topTags.length) % colors.length],
											cursor: 'pointer',
										}}
										onClick={() => {
											const newValue = query + ' @' + mention.name + ' ';
											setQuery(newValue);
											fetchAll(newValue, since, until);
										}}
									>
										{' '}
										@{mention.name} ({mention.usage_count})
									</span>
								</span>
							);
						})
					) : (
						<span className="cg"> no avalible mentions</span>
					)}
				</div>
			</div>
		</div>
	);
};

const ExpensesLineChart = ({ data }) => {
	if (!data || !Array.isArray(data)) return null;
	console.log('data : ', data);
	return (
		<div
			style={{
				flex: 1,
				height: '400px',
				minHeight: 400,
				width: '100%',
				position: 'relative',
				// background: 'red',
			}}
		>
			<h3
				className="cg"
				style={{
					textAlign: 'center',
					marginBottom: 4,
				}}
			>
				Daily Expenses
			</h3>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={data}
					margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
					style={{ padding: 10 }}
					width="100%"
					height="100%"
				>
					<CartesianGrid stroke="#119c11" strokeDasharray="3 3" />
					<XAxis
						dataKey="date"
						tick={{ fill: '#33ff33', fontSize: 12 }}
						tickFormatter={(value, index) => {
							const d = data[index];
							return `${d.day}\n${new Date(value).getDate()}`;
						}}
						interval={0}
						angle={-45}
						textAnchor="end"
						height={60}
					/>
					<YAxis
						tick={{ fill: '#33ff33' }}
						tickFormatter={value =>
							`${(value / 1000).toLocaleString()}${value > 0 ? 'k' : ''}`
						}
					/>
					<Tooltip
						content={<LineChartToolTip />}
						contentStyle={{
							backgroundColor: '#000',
							border: '1px solid #33ff33',
							color: '#33ff33',
						}}
						// formatter={value => [`${value.toLocaleString()} Toman`, 'Total']}
						// labelFormatter={label => new Date(label).toISOString().slice(0, 10)}
					/>
					<Line
						type="linear"
						dataKey="total"
						stroke="#33ff33"
						strokeWidth={2}
						dot={{ r: 5, strokeWidth: 2, fill: '#33ff33' }}
						activeDot={{ r: 7 }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
};

export default ExpensesLineChart;
