import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Memory, Person } from '../domain';
import { AppText, Button, Card, Page, TextField } from '../components/ui';

export default function PeopleScreen({
  people,
  memories,
  onOpenPerson,
}: {
  people: Person[];
  memories: Memory[];
  onOpenPerson: (person: Person | null) => void;
}) {
  const [query, setQuery] = useState('');
  const shownPeople = useMemo(
    () =>
      people.filter(item =>
        `${item.fullName} ${item.mentionKey}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
      ),
    [people, query],
  );

  return (
    <Page>
      <View style={styles.titleRow}>
        <AppText bold accent style={styles.title}>PERSONS</AppText>
        <Button title="+ ADD" onPress={() => onOpenPerson(null)} style={styles.addButton} />
      </View>
      <TextField label="FIND A PERSON" value={query} onChangeText={setQuery} />
      {shownPeople.length ? (
        shownPeople.map(item => (
          <Pressable key={item.id} onPress={() => onOpenPerson(item)}>
            <Card style={styles.personCard}>
              {item.avatarBase64 ? (
                <Image
                  source={{
                    uri: `data:${item.avatarMimeType ?? 'image/jpeg'};base64,${item.avatarBase64}`,
                  }}
                  style={styles.listAvatar}
                />
              ) : (
                <View style={[styles.listAvatar, styles.avatarEmpty]}>
                  <AppText accent>{item.fullName.slice(0, 1).toUpperCase()}</AppText>
                </View>
              )}
              <View style={styles.personInfo}>
                <AppText bold>{item.fullName}</AppText>
                <AppText muted>@{item.mentionKey}</AppText>
                {item.description ? (
                  <AppText muted numberOfLines={1}>{item.description}</AppText>
                ) : null}
              </View>
              <AppText muted>
                {memories.filter(memory => memory.people.includes(item.mentionKey)).length}
              </AppText>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card><AppText muted>No persons yet. Add one or mention someone in a memory.</AppText></Card>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 19, letterSpacing: 1.5 },
  addButton: { minHeight: 38 },
  personCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personInfo: { flex: 1, gap: 2 },
  listAvatar: { height: 48, width: 48, borderRadius: 24 },
  avatarEmpty: {
    backgroundColor: '#0D160D',
    borderWidth: 1,
    borderColor: '#39FF5B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
