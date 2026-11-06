import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import {
	getUpcomingBirthdays,
	Memory,
	GapStats,
	EntityUsage,
} from '../domain';
import { entityColors, useTheme } from '../theme';
import {
	getBirthdayPeople,
	getEntitySuggestions,
	getMemoryAnalytics,
	getMemoryPage,
	getMemoryTopEntities,
} from '../database';
import ActivityHeatmap from '../components/ActivityHeatmap';
import EntityInput from '../components/EntityInput';
import MemoryCard from '../components/MemoryCard';
import { AppText, Button, Card, DateFilterField, Page } from '../components/ui';

type Props = {
	onEdit: (memory: Memory) => void;
};

const MEMORY_BATCH_SIZE = 40;
const SCROLL_LOAD_THRESHOLD = 240;
const emptyStats: GapStats = {
	count: 0,
	firstDate: null,
	lastDate: null,
	mean: 0,
	median: 0,
	standardDeviation: 0,
	minimum: 0,
	maximum: 0,
};

function dateLabel(value: string) {
	return new Date(value).toLocaleString([], {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function days(value: number) {
	if (value < 1) return `${(value * 24).toFixed(2)} h`;
	return `${value.toFixed(2)} d`;
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<Card style={styles.stat}>
			<AppText muted style={styles.statLabel}>
				{label}
			</AppText>
			<AppText bold accent style={styles.statValue}>
				{value}
			</AppText>
		</Card>
	);
}

export default function MemoriesScreen({
	onEdit,
}: Props) {
	const { theme } = useTheme();
	const [tab, setTab] = useState<'memories' | 'analytics'>('memories');
	const [query, setQuery] = useState('');
	const [since, setSince] = useState('');
	const [until, setUntil] = useState('');
	const [heatmapYear, setHeatmapYear] = useState(() =>
		new Date().getFullYear(),
	);
	const [memories, setMemories] = useState<Memory[]>([]);
	const [totalMemories, setTotalMemories] = useState(0);
	const [stats, setStats] = useState<GapStats>(emptyStats);
	const [topTags, setTopTags] = useState<EntityUsage[]>([]);
	const [topMentions, setTopMentions] = useState<EntityUsage[]>([]);
	const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
	const [upcomingBirthdays, setUpcomingBirthdays] = useState<
		ReturnType<typeof getUpcomingBirthdays>
	>([]);
	const [loading, setLoading] = useState(true);
	const [analyticsLoading, setAnalyticsLoading] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const [loadingMore, setLoadingMore] = useState(false);
	const loadMoreLock = useRef(false);
	const requestGeneration = useRef(0);

	useFocusEffect(
		useCallback(() => {
			let active = true;
			const generation = ++requestGeneration.current;
			setLoading(true);
			setLoadingMore(false);
			setFailure(null);
			setMemories([]);
			setTotalMemories(0);
			const timer = setTimeout(() => {
				Promise.all([
					getMemoryPage(query, since, until, MEMORY_BATCH_SIZE, 0),
					getMemoryTopEntities(query, since, until),
				])
					.then(([page, topEntities]) => {
						if (!active) return;
						setMemories(page.items);
						setTotalMemories(page.total);
						setTopTags(topEntities.tags);
						setTopMentions(topEntities.mentions);
					})
					.catch(error => {
						if (active) {
							setFailure(error instanceof Error ? error.message : String(error));
						}
					})
					.finally(() => {
						if (active) setLoading(false);
					});
			}, 150);
			return () => {
				active = false;
				if (requestGeneration.current === generation) {
					requestGeneration.current += 1;
				}
				clearTimeout(timer);
				loadMoreLock.current = false;
			};
		}, [query, since, until]),
	);

	useFocusEffect(
		useCallback(() => {
			let active = true;
			getBirthdayPeople()
				.then(birthdayPeople => {
					if (active) setUpcomingBirthdays(getUpcomingBirthdays(birthdayPeople));
				})
				.catch(error => {
					if (active) {
						setFailure(error instanceof Error ? error.message : String(error));
					}
				});
			return () => {
				active = false;
			};
		}, []),
	);

	useFocusEffect(
		useCallback(() => {
			if (tab !== 'analytics') return;
			let active = true;
			setAnalyticsLoading(true);
			const timer = setTimeout(() => {
				getMemoryAnalytics(query, since, until, heatmapYear)
					.then(analytics => {
						if (!active) return;
						setStats(analytics.stats);
						setActivityCounts(analytics.activityCounts);
					})
					.catch(error => {
						if (active) {
							setFailure(error instanceof Error ? error.message : String(error));
						}
					})
					.finally(() => {
						if (active) setAnalyticsLoading(false);
					});
			}, 150);
			return () => {
				active = false;
				clearTimeout(timer);
			};
		}, [heatmapYear, query, since, tab, until]),
	);

	const onScroll = (event: {
		nativeEvent: {
			contentOffset: { y: number };
			layoutMeasurement: { height: number };
			contentSize: { height: number };
		};
	}) => {
		if (
			tab !== 'memories' ||
			loading ||
			loadingMore ||
			loadMoreLock.current ||
			memories.length >= totalMemories
		) return;
		const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
		if (
			contentOffset.y + layoutMeasurement.height >=
			contentSize.height - SCROLL_LOAD_THRESHOLD
		) {
			loadMoreLock.current = true;
			setLoadingMore(true);
			const generation = requestGeneration.current;
			getMemoryPage(query, since, until, MEMORY_BATCH_SIZE, memories.length)
				.then(page => {
					if (requestGeneration.current !== generation) return;
					setMemories(current => [...current, ...page.items]);
					setTotalMemories(page.total);
				})
				.catch(error => {
					if (requestGeneration.current === generation) {
						setFailure(error instanceof Error ? error.message : String(error));
					}
				})
				.finally(() => {
					if (requestGeneration.current === generation) {
						loadMoreLock.current = false;
						setLoadingMore(false);
					}
				});
		}
	};

	const addEntityFilter = (token: string) => {
		const nextQuery = `${query.trim()} ${token} `.trimStart();
		setQuery(nextQuery);
	};

	return (
		<View style={styles.screen}>
			<Page style={styles.page} onScroll={onScroll}>
				<View style={styles.titleRow}>
					<AppText bold accent style={styles.title}>
						MEMORIES
					</AppText>
					<View style={styles.dateRow}>
						<View style={styles.dateFilters}>
							<DateFilterField
								label="SINCE"
								value={since}
								onChange={setSince}
								compact
								small
								clearInside
								showYear
							/>
							<DateFilterField
								label="UNTIL"
								value={until}
								onChange={setUntil}
								compact
								small
								clearInside
								showYear
							/>
						</View>
					</View>
				</View>

				<View style={styles.filterRow}>
					<View style={styles.search}>
						<EntityInput
							value={query}
							onChangeText={setQuery}
							loadSuggestions={getEntitySuggestions}
						/>
					</View>
					<Button
						title="CLEAR"
						secondary
						onPress={() => {
							setQuery('');
							setSince('');
							setUntil('');
						}}
						style={styles.clearButton}
					/>
				</View>
				<View style={styles.topEntities}>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.entityRow}
					>
						{topTags.length ? (
							topTags.map((tag, index) => (
								<Pressable
									key={tag.name}
									onPress={() => addEntityFilter(`#${tag.name}`)}
								>
									<AppText
										numberOfLines={1}
										style={[
											styles.entityText,
											{ color: entityColors[index % entityColors.length] },
										]}
									>
										{tag.name} ({tag.usageCount})
									</AppText>
								</Pressable>
							))
						) : (
							<AppText numberOfLines={1} accent style={styles.emptyEntityText}>
								NO AVAILABLE TAGS
							</AppText>
						)}
					</ScrollView>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={styles.entityRow}
					>
						{topMentions.length ? (
							topMentions.map((mention, index) => (
								<Pressable
									key={mention.name}
									onPress={() => addEntityFilter(`@${mention.name}`)}
								>
									<AppText
										numberOfLines={1}
										style={[
											styles.entityText,
											{
												color:
													entityColors[
														(index + topTags.length) % entityColors.length
													],
											},
										]}
									>
										@{mention.name} ({mention.usageCount})
									</AppText>
								</Pressable>
							))
						) : (
							<AppText numberOfLines={1} accent style={styles.emptyEntityText}>
								NO AVAILABLE MENTIONS
							</AppText>
						)}
					</ScrollView>
				</View>

				{/* Enhanced Birthday Alert Announcement */}
				{upcomingBirthdays.length > 0 && (
					<View
						style={[
							styles.birthdayCard,
							{ backgroundColor: `${theme.green}15`, borderColor: theme.green },
						]}
					>
						<Svg width={18} height={18} viewBox="0 0 24 24" fill={theme.green}>
							<Path d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l.25-.49H7.15l.25.49c.87 1.74 2.65 2.87 4.6 2.87s3.73-1.13 4.6-2.87zm-1.89-6.99c-.77-.92-1.92-1.5-3.21-1.5s-2.44.58-3.21 1.5H7.15c.67.76 1.48 1.37 2.4 1.78l-.34.68-.02.04c-.39.78-.63 1.63-.69 2.5h7c-.06-.87-.3-1.72-.69-2.5l-.36-.72c.92-.41 1.73-1.02 2.4-1.78h-1.13z" />
						</Svg>
						<View style={styles.birthdayTextGroup}>
							{upcomingBirthdays.map(({ person, date }) => (
								<AppText key={person.id} style={styles.birthdayItem}>
									<AppText bold>
										{person.fullName.trim() || `@${person.mentionKey}`}
									</AppText>
									{' has birthday on '}
									<AppText bold accent>
										{date.toLocaleDateString([], {
											month: 'short',
											day: 'numeric',
										})}
									</AppText>
								</AppText>
							))}
						</View>
					</View>
				)}

				<View style={[styles.tabs, { borderBottomColor: theme.border }]}>
					{(['memories', 'analytics'] as const).map(item => (
						<Pressable
							key={item}
							onPress={() => setTab(item)}
							style={[
								styles.tab,
								tab === item && { borderBottomColor: theme.green },
							]}
						>
							<AppText bold accent={tab === item}>
								{item.toUpperCase()}
							</AppText>
						</Pressable>
					))}
				</View>
				{tab === 'memories' ? (
					<View style={styles.list}>
						{failure ? (
							<Card><AppText muted>{failure}</AppText></Card>
						) : memories.length === 0 && loading ? (
							<Card><AppText muted>Loading memories…</AppText></Card>
						) : totalMemories === 0 ? (
							<Card>
								<AppText muted>No memories match these filters.</AppText>
							</Card>
						) : (
							memories.map(memory => (
								<Pressable key={memory.id} onPress={() => onEdit(memory)}>
									<MemoryCard memory={memory} />
								</Pressable>
							))
						)}
						{loadingMore ? <AppText muted>Loading more…</AppText> : null}
					</View>
				) : (
					<View style={styles.analytics}>
						{failure ? <Card><AppText>{failure}</AppText></Card> : null}
						{analyticsLoading ? <AppText muted>Updating analytics…</AppText> : null}
						<Card>
							<View style={styles.heatmapHeader}>
								<AppText bold accent>
									ACTIVITY
								</AppText>
								<View style={styles.yearNavigation}>
									<Pressable
										accessibilityRole="button"
										accessibilityLabel={`Show ${heatmapYear - 1}`}
										onPress={() => setHeatmapYear(year => year - 1)}
										hitSlop={8}
									>
										<AppText accent style={styles.yearArrow}>
											‹
										</AppText>
									</Pressable>
									<Pressable
										accessibilityRole="button"
										accessibilityLabel={`Show next year after ${heatmapYear}`}
										onPress={() => setHeatmapYear(year => year + 1)}
										hitSlop={8}
									>
										<AppText bold accent style={styles.yearLabel}>
											{heatmapYear}
										</AppText>
									</Pressable>
									<Pressable
										accessibilityRole="button"
										accessibilityLabel={`Show ${heatmapYear + 1}`}
										onPress={() => setHeatmapYear(year => year + 1)}
										hitSlop={8}
									>
										<AppText accent style={styles.yearArrow}>
											›
										</AppText>
									</Pressable>
								</View>
							</View>
							<ActivityHeatmap counts={activityCounts} year={heatmapYear} />
							<AppText muted style={styles.hint}>
								{stats.count} matching memories across your selected
								filters.
							</AppText>
						</Card>
						<View style={styles.statsGrid}>
							<Stat label="TOTAL" value={String(stats.count)} />
							<Stat label="MEAN GAP" value={days(stats.mean)} />
							<Stat label="MEDIAN GAP" value={days(stats.median)} />
							<Stat label="STDV" value={days(stats.standardDeviation)} />
							<Stat label="MIN GAP" value={days(stats.minimum)} />
							<Stat label="MAX GAP" value={days(stats.maximum)} />
						</View>
						<Card>
							<AppText muted>FIRST MEMORY</AppText>
							<AppText accent>
								{stats.firstDate ? dateLabel(stats.firstDate) : '—'}
							</AppText>
							<AppText muted>LAST MEMORY</AppText>
							<AppText accent>
								{stats.lastDate ? dateLabel(stats.lastDate) : '—'}
							</AppText>
						</Card>
					</View>
				)}
			</Page>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1 },
	page: { paddingBottom: 16, gap: 14 },
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
	},
	title: { fontSize: 19, letterSpacing: 1.5 },
	hint: { fontSize: 10 },
	filterRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
	search: { flex: 1, zIndex: 2, overflow: 'visible' },
	clearButton: { minHeight: 46, paddingHorizontal: 10 },
	dateRow: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
	},
	dateFilters: { width: '85%', flexDirection: 'row', alignItems: 'center', gap: 6 },
	topEntities: { gap: 2, paddingHorizontal: 2 },
	birthdayCard: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
	},
	birthdayTextGroup: {
		flex: 1,
		gap: 2,
	},
	birthdayItem: {
		fontSize: 12,
		lineHeight: 18,
	},
	entityRow: {
		flexDirection: 'row',
		flexWrap: 'nowrap',
		alignItems: 'center',
		gap: 8,
	},
	entityText: { fontSize: 10, lineHeight: 18 },
	emptyEntityText: { fontSize: 9 },
	tabs: { flexDirection: 'row', borderBottomWidth: 1 },
	heatmapHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	yearNavigation: { flexDirection: 'row', alignItems: 'center', gap: 14 },
	yearArrow: { fontSize: 24, lineHeight: 28 },
	yearLabel: { fontSize: 14, minWidth: 42, textAlign: 'center' },
	tab: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: 2,
		borderBottomColor: 'transparent',
	},
	list: { gap: 10 },
	analytics: { gap: 12 },
	statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	stat: { width: '48%', minHeight: 78, justifyContent: 'space-between' },
	statLabel: { fontSize: 10 },
	statValue: { fontSize: 18 },
});
