import React from 'react';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';

const ExpensesLineChart = ({ data }) => {
	if (!data || !Array.isArray(data)) return null;
	return (
		<div
			style={{
				flex: 1,
				height: '400px',
				minHeight: 400,
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
						contentStyle={{
							backgroundColor: '#000',
							border: '1px solid #33ff33',
							color: '#33ff33',
						}}
						formatter={value => [`${value.toLocaleString()} Toman`, 'Total']}
						labelFormatter={label => new Date(label).toISOString().slice(0, 10)}
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
