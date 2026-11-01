import { useEffect, useRef } from 'react';
import colors from '../../utils/colors';
import SearchInput from './searchInput';
import { formatDateTime } from '../../utils/date';
import DatePicker from 'react-datepicker';
export default ({
	fetchAll,
	query,
	setQuery,
	topTags,
	topMentions,
	since,
	until,
	setSince,
	setUntil,
}) => {
	const clearButtonEnabled = Boolean(query || since || until);
	return (
		<div style={{ paddingTop: 8 }}>
			<div
				style={{
					padding: '0 8px',
					marginBottom: 8,
					display: 'flex', // 👈 bring it back
					alignItems: 'center', // vertically align
					flexWrap: 'wrap', // allow wrapping if screen is small
				}}
			>
				<SearchInput
					value={query}
					setValue={setQuery}
					fetchAll={fetchAll}
					since={since}
					until={until}
				/>
				<button
					disabled={!clearButtonEnabled}
					style={{
						cursor: !clearButtonEnabled ? 'no-drop' : 'pointer',
						margin: 1,
					}}
					className="g-btn"
					onClick={() => {
						if (!clearButtonEnabled) return;
						setQuery('');
						setUntil(null);
						setSince(null);
						fetchAll('', null, null);
					}}
				>
					clear filters
				</button>
				<div
					className="date-range cg"
					style={{
						marginLeft: 8,
						padding: '4px 8px',
						borderBottom: '1px solid #33ff33',
						border: 'none',
					}}
				>
					<label>since</label>
					<DatePicker
						selected={since}
						onChange={date => {
							setSince(date);
							fetchAll(query, date, until);
						}}
						calendarClassName="evil-terminal-calendar"
						dayClassName={() => 'evil-terminal-day'}
						customInput={
							<button
								className="g-btn"
								// style={{ display: 'inline !important' }}
							>
								{' '}
								{since ? formatDateTime(since) : 'not specified'}{' '}
							</button>
						}
						// withPortal
					/>
					<label>until</label>
					<DatePicker
						selected={until}
						onChange={date => {
							setUntil(date);
							fetchAll(query, since, date);
						}}
						calendarClassName="evil-terminal-calendar"
						dayClassName={() => 'evil-terminal-day'}
						customInput={
							<button
								className="g-btn"
								// style={{ display: 'inline !important' }}
							>
								{' '}
								{until ? formatDateTime(until) : 'not specified'}{' '}
							</button>
						}
						// withPortal
					/>
				</div>
			</div>
			<div style={{ minHeight: 50 }}>
				<div style={{ padding: '0 8px', marginBottom: 4 }}>
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
									<span className="bg-w">
										{' '}
										{index < arr.length - 1 ? '|' : ''}{' '}
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
									<span className="bg-w">
										{' '}
										{index < arr.length - 1 ? '|' : ''}{' '}
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
