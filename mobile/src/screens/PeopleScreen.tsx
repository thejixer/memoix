import { useCallback, useRef, useState } from 'react';
import {
	Image,
	NativeScrollEvent,
	NativeSyntheticEvent,
	Pressable,
	StyleSheet,
	View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { PersonListItem, TagListItem, getPeopleListPage, getTagsListPage } from '../database';
import { Person, Tag } from '../domain';
import { AppText, Button, Card, Page, TextField } from '../components/ui';
import { useTheme } from '../theme';

const LIST_BATCH_SIZE = 40;
const TAG_BATCH_SIZE = LIST_BATCH_SIZE * 2;
const SCROLL_LOAD_THRESHOLD = 240;

export default function PeopleScreen({
	onOpenPerson,
	onOpenTag,
}: {
	onOpenPerson: (person: Person | null) => void;
	onOpenTag: (tag: Tag | null) => void;
}) {
	const { theme } = useTheme();
	const [tab, setTab] = useState<'persons' | 'tags'>('persons');
	const [personQuery, setPersonQuery] = useState('');
	const [tagQuery, setTagQuery] = useState('');
	const [people, setPeople] = useState<PersonListItem[]>([]);
	const [tags, setTags] = useState<TagListItem[]>([]);
	const [totalItems, setTotalItems] = useState(0);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [failure, setFailure] = useState<string | null>(null);
	const loadMoreLock = useRef(false);
	const requestGeneration = useRef(0);

	useFocusEffect(
		useCallback(() => {
			let active = true;
			const generation = ++requestGeneration.current;
			setLoading(true);
			setLoadingMore(false);
			setFailure(null);
			setTotalItems(0);
			if (tab === 'persons') setPeople([]);
			else setTags([]);
			loadMoreLock.current = false;
			const timer = setTimeout(() => {
				const request = tab === 'persons'
					? getPeopleListPage(personQuery, LIST_BATCH_SIZE, 0).then(page => {
						if (!active) return;
						setPeople(page.items);
						setTotalItems(page.total);
					})
					: getTagsListPage(tagQuery, TAG_BATCH_SIZE, 0).then(page => {
						if (!active) return;
						setTags(page.items);
						setTotalItems(page.total);
					});
				request
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
		}, [personQuery, tab, tagQuery]),
	);

	const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const currentItems = tab === 'persons' ? people : tags;
		const batchSize = tab === 'persons' ? LIST_BATCH_SIZE : TAG_BATCH_SIZE;
		if (
			loading ||
			loadingMore ||
			loadMoreLock.current ||
			currentItems.length >= totalItems
		) return;
		const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
		if (
			contentOffset.y + layoutMeasurement.height >=
			contentSize.height - SCROLL_LOAD_THRESHOLD
		) {
			loadMoreLock.current = true;
			setLoadingMore(true);
			const generation = requestGeneration.current;
			const request = tab === 'persons'
				? getPeopleListPage(personQuery, batchSize, currentItems.length).then(page => {
					if (requestGeneration.current !== generation) return;
					setPeople(current => [...current, ...page.items]);
					setTotalItems(page.total);
				})
				: getTagsListPage(tagQuery, batchSize, currentItems.length).then(page => {
					if (requestGeneration.current !== generation) return;
					setTags(current => [...current, ...page.items]);
					setTotalItems(page.total);
				});
			request
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

	return (
		<Page onScroll={onScroll}>
			<View style={styles.header}>
				<AppText bold accent style={styles.title}>
					PEOPLE &amp; TAGS
				</AppText>
			</View>
			<View style={[styles.tabs, { borderBottomColor: theme.border }]}>
				{(['persons', 'tags'] as const).map(item => (
					<Pressable
						key={item}
						accessibilityRole="tab"
						accessibilityState={{ selected: tab === item }}
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
			{failure ? <Card><AppText>{failure}</AppText></Card> : null}
			{tab === 'persons' ? (
				<>
					<View style={styles.sectionHeader}>
						<View style={styles.searchField}>
							<TextField
								label=""
								value={personQuery}
								placeholder="FIND A PERSON"
								onChangeText={setPersonQuery}
								style={styles.searchInput}
							/>
							<SearchIcon />
						</View>
						<Button
							title="+ ADD"
							onPress={() => onOpenPerson(null)}
							style={styles.addButton}
						/>
					</View>
					{people.length ? (
						people.map(({ person, count }) => (
							<Pressable key={person.id} onPress={() => onOpenPerson(person)}>
								<Card style={styles.personCard}>
									{person.avatarBase64 ? (
										<Image
											source={{
												uri: `data:${person.avatarMimeType ?? 'image/jpeg'};base64,${person.avatarBase64}`,
											}}
											style={styles.listAvatar}
										/>
									) : (
										<View
											style={[
												styles.listAvatar,
												styles.avatarEmpty,
												{
													backgroundColor: theme.surfaceRaised,
													borderColor: theme.green,
												},
											]}
										>
											<AppText accent>
												{(person.fullName.trim() || person.mentionKey)
													.slice(0, 1)
													.toUpperCase()}
											</AppText>
										</View>
									)}
									<View style={styles.personInfo}>
										{person.fullName.trim() ? (
											<AppText bold>{person.fullName}</AppText>
										) : null}
										<AppText muted>
											@{person.mentionKey}
											{person.fullName.trim() ? '' : ' · handle'}
										</AppText>
										{person.description ? (
											<AppText muted numberOfLines={1}>
												{person.description}
											</AppText>
										) : null}
									</View>
									<AppText muted>{count}</AppText>
								</Card>
							</Pressable>
						))
					) : (
						<Card>
							<AppText muted>
								{loading
									? 'Loading people…'
									: 'No persons yet. Add one or mention someone in a memory.'}
							</AppText>
						</Card>
					)}
				</>
			) : (
				<>
					<View style={styles.sectionHeader}>
						<View style={styles.searchField}>
							<TextField
								label=""
								value={tagQuery}
								placeholder="FIND A TAG"
								onChangeText={setTagQuery}
								style={styles.searchInput}
							/>
							<SearchIcon />
						</View>
						<Button
							title="+ ADD"
							onPress={() => onOpenTag(null)}
							style={styles.addButton}
						/>
					</View>
					{tags.length ? (
						<View style={styles.tagGrid}>
							{tags.map(({ tag, count }) => (
								<Pressable
									accessibilityRole="button"
									key={tag.id}
									onPress={() => onOpenTag(tag)}
									style={styles.tagChip}
								>
									<AppText bold accent numberOfLines={1}>
										#{tag.name}
									</AppText>
									<AppText muted>{count}</AppText>
								</Pressable>
							))}
						</View>
					) : (
						<Card>
							<AppText muted>
								{loading
									? 'Loading tags…'
									: 'No tags yet. Add one or use #tag in a memory.'}
							</AppText>
						</Card>
					)}
				</>
			)}
			{loadingMore ? <AppText muted>Loading more…</AppText> : null}
		</Page>
	);
}

function SearchIcon() {
	const { theme } = useTheme();
	return (
		<View pointerEvents="none" style={styles.searchIcon}>
			<Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
				<Circle cx={10.8} cy={10.8} r={6.3} stroke={theme.muted} strokeWidth={2} />
				<Path d="m15.5 15.5 5 5" stroke={theme.muted} strokeWidth={2} strokeLinecap="round" />
			</Svg>
		</View>
	);
}

const styles = StyleSheet.create({
	header: { flexDirection: 'row', alignItems: 'center' },
	title: { fontSize: 19, letterSpacing: 1.5 },
	tabs: {
		flexDirection: 'row',
		borderBottomWidth: 1,
	},
	tab: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 10,
		borderBottomWidth: 2,
		borderBottomColor: 'transparent',
	},
	sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
	searchField: { flex: 1, position: 'relative' },
	searchInput: { paddingLeft: 38 },
	searchIcon: { position: 'absolute', left: 12, top: 14 },
	addButton: { minHeight: 46, paddingHorizontal: 10 },
	personCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	personInfo: { flex: 1, gap: 2 },
	listAvatar: { height: 48, width: 48, borderRadius: 24 },
	avatarEmpty: {
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	tagChip: {
		maxWidth: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		borderWidth: 1,
		borderRadius: 16,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
});
