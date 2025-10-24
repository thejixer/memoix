import colors from '../../utils/colors';
import SearchInput from './searchInput';
import { formatDateTime } from '../../utils/date';
export default ({
	fetchAll,
	query,
	setQuery,
	topTags,
	topMentions,
	setDateModalOpen,
	since,
	until,
	setSince,
	setUntil,
}) => {
	const clearButtonEnabled = Boolean(query || since || until);
	return (
		<div style={{ paddingTop: 8 }}>
			<div style={{ padding: '0 8px', marginBottom: 8 }}>
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
				<button
					className="g-btn"
					style={{ margin: 1 }}
					onClick={setDateModalOpen}
				>
					date thing
				</button>

				<span className="cg">
					{' '}
					{!!since || !!until ? 'date filter is on' : ''}{' '}
					{!!since ? `since ${formatDateTime(since)}` : ''}{' '}
					{!!until ? `until ${formatDateTime(until)}` : ''}
				</span>
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
