import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Memory, Person, Tag } from '../domain';
import { AppText, Button, Card, Page, TextField } from '../components/ui';
import { useTheme } from '../theme';

export default function PeopleScreen({
	people,
	memories,
	tags,
	onOpenPerson,
	onOpenTag,
}: {
	people: Person[];
	memories: Memory[];
	tags: Tag[];
	onOpenPerson: (person: Person | null) => void;
	onOpenTag: (tag: Tag | null) => void;
}) {
	const { theme } = useTheme();
	const [tab, setTab] = useState<'persons' | 'tags'>('persons');
	const [personQuery, setPersonQuery] = useState('');
	const [tagQuery, setTagQuery] = useState('');
	const shownPeople = useMemo(() => {
		const normalizedQuery = personQuery.toLocaleLowerCase();

		return people
			.map(person => ({
				person,
				count: memories.filter(memory =>
					memory.people.includes(person.mentionKey),
				).length,
			}))
			.filter(({ person }) =>
				`${person.fullName} ${person.mentionKey}`
					.toLocaleLowerCase()
					.includes(normalizedQuery),
			)
			.sort(
				(a, b) =>
					b.count - a.count ||
					a.person.fullName.localeCompare(b.person.fullName),
			);
	}, [people, memories, personQuery]);
	const tagCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const memory of memories) {
			for (const name of new Set(
				memory.tags.map(value => value.toLocaleLowerCase()),
			)) {
				counts.set(name, (counts.get(name) ?? 0) + 1);
			}
		}
		return counts;
	}, [memories]);
	const shownTags = useMemo(
		() =>
			tags
				.filter(item =>
					item.name.toLocaleLowerCase().includes(tagQuery.toLocaleLowerCase()),
				)
				.map(item => ({
					tag: item,
					count: tagCounts.get(item.name.toLocaleLowerCase()) ?? 0,
				}))
				.sort(
					(a, b) => b.count - a.count || a.tag.name.localeCompare(b.tag.name),
				),
		[tagCounts, tagQuery, tags],
	);

	return (
		<Page>
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
						style={[styles.tab, tab === item && { borderBottomColor: theme.green }]}
					>
						<AppText bold accent={tab === item}>
							{item.toUpperCase()}
						</AppText>
					</Pressable>
				))}
			</View>
			{tab === 'persons' ? (
				<>
					<View style={styles.sectionHeader}>
						<TextField
							label="FIND A PERSON"
							value={personQuery}
							onChangeText={setPersonQuery}
						/>
						<Button
							title="+ ADD"
							onPress={() => onOpenPerson(null)}
							style={styles.addButton}
						/>
					</View>
					{shownPeople.length ? (
						shownPeople.map(({ person, count }) => (
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
												{ backgroundColor: theme.surfaceRaised, borderColor: theme.green },
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
								No persons yet. Add one or mention someone in a memory.
							</AppText>
						</Card>
					)}
				</>
			) : (
				<>
					<View style={styles.sectionHeader}>
						<TextField
							label="FIND A TAG"
							value={tagQuery}
							onChangeText={setTagQuery}
						/>
						<Button
							title="+ ADD"
							onPress={() => onOpenTag(null)}
							style={styles.addButton}
						/>
					</View>
					{shownTags.length ? (
						<View style={styles.tagGrid}>
							{shownTags.map(({ tag, count }) => (
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
								No tags yet. Add one or use #tag in a memory.
							</AppText>
						</Card>
					)}
				</>
			)}
		</Page>
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
