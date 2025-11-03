import React from 'react';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';

const TagExpensesBarChart = ({data}) => {
	return (
		<div
			style={{
				flex: 1,
				height: '400px',
				minHeight: 400,
				// background: 'blue',
			}}
		>
			<h3
				style={{
					marginBottom: 4,
					textAlign: 'center',
				}}
			>
				Expenses by Tag
			</h3>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
					<CartesianGrid stroke="#33ff33" strokeDasharray="3 3" />
					<XAxis
						dataKey="tag"
						tick={{ fill: '#33ff33', fontSize: 12 }}
						angle={-45}
						textAnchor="end"
						interval={0}
						height={60}
					/>
					<YAxis
						tick={{ fill: '#33ff33', fontSize: 12 }}
						tickFormatter={value =>
							`${(value / 1000).toLocaleString()}${value > 0 ? 'k' : ''}`
						}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: '#000',
							border: '1px solid #33ff33',
						}}
						formatter={(value, index, { payload }) => [
							`${value.toLocaleString()} Toman`,
							'Total',
						]}
						cursor={{ fill: 'rgba(0,0,0,0.1)' }}
					/>
					<Bar dataKey="total" fill="#33ff33" />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};

export default TagExpensesBarChart;
