import { formatDateTime, toISODate } from '../../utils/date';
import ActivityHeatmap from '../../components/heatmap';
export default ({ stats }) => {
	const datesObj = {};

	(stats?.dates || []).forEach(d => {
		const date = new Date(d);
		datesObj[toISODate(date)] = 1;
	});

	return (
		<div>
			<ActivityHeatmap data={datesObj} />
			<div className="stats-container" style={{ marginTop: 12 }}>
				<div className="stat-item">
					<span className="stat-title">Total count:</span>
					<span className="stat-value"> {stats.total_count} </span>
				</div>
				<div className="stat-item">
					<span className="stat-title">first occurnace:</span>
					<span className="stat-value">
						{' '}
						{formatDateTime(new Date(stats.first_date))}{' '}
					</span>
				</div>
				<div className="stat-item">
					<span className="stat-title">last occurnace:</span>
					<span className="stat-value">
						{' '}
						{formatDateTime(new Date(stats.last_date))}{' '}
					</span>
				</div>
				<div className="stat-item">
					<span className="stat-title">average gap:</span>
					<span className="stat-value"> {stats.average_gap.toFixed(3)} </span>
				</div>
				<div className="stat-item">
					<span className="stat-title">median gap:</span>
					<span className="stat-value"> {stats.median_gap.toFixed(3)} </span>
				</div>
				<div className="stat-item">
					<span className="stat-title">min gap:</span>
					<span className="stat-value"> {stats.min_gap.toFixed(3)} </span>
				</div>
				<div className="stat-item">
					<span className="stat-title">max gap:</span>
					<span className="stat-value"> {stats.max_gap.toFixed(3)} </span>
				</div>
				<div className="stat-item">
					<span className="stat-title">stdv gap:</span>
					<span className="stat-value"> {stats.std_dev_gap.toFixed(3)} </span>
				</div>
			</div>
		</div>
	);
};
