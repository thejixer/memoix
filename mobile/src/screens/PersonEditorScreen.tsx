import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { deletePerson, savePerson } from '../database';
import { localDateKey, Memory, Person } from '../domain';
import { theme } from '../theme';
import { AppText, Button, Card, OptionalDateField, Page, TextField } from '../components/ui';

export default function PersonEditorScreen({
  person,
  memories,
  onChanged,
  onClose,
}: {
  person: Person | null;
  memories: Memory[];
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'memories' | 'edit'>(person ? 'memories' : 'edit');
  const [fullName, setFullName] = useState(person?.fullName ?? '');
  const [mentionKey, setMentionKey] = useState(person?.mentionKey ?? '');
  const [description, setDescription] = useState(person?.description ?? '');
  const [birthdate, setBirthdate] = useState(person?.birthdate ?? '');
  const [phoneNumber, setPhoneNumber] = useState(person?.phoneNumber ?? '');
  const [avatarBase64, setAvatarBase64] = useState<string | null>(
    person?.avatarBase64 ?? null,
  );
  const [avatarMimeType, setAvatarMimeType] = useState<string | null>(
    person?.avatarMimeType ?? null,
  );
  const linkedMemories = person
    ? memories.filter(memory => memory.people.includes(person.mentionKey))
    : [];

  const pickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo permission required', 'Allow photo access to choose an avatar.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.65,
        base64: true,
      });
      if (!result.canceled) {
        setAvatarBase64(result.assets[0].base64 ?? null);
        setAvatarMimeType(result.assets[0].mimeType ?? 'image/jpeg');
      }
    } catch (error) {
      Alert.alert('Could not choose avatar', error instanceof Error ? error.message : String(error));
    }
  };

  const save = async () => {
    if (!mentionKey.trim()) {
      Alert.alert('Handle required', 'Enter the handle used in @mentions.');
      return;
    }
    if (birthdate && !isValidDate(birthdate)) {
      Alert.alert('Invalid birthdate', 'Choose a valid calendar date.');
      return;
    }
    try {
      await savePerson({
        ...(person ? { id: person.id } : {}),
        mentionKey: mentionKey.trim().replace(/^@/, ''),
        fullName: fullName.trim(),
        description: description.trim(),
        birthdate: birthdate.trim() || null,
        phoneNumber: phoneNumber.trim(),
        avatarBase64,
        avatarMimeType,
      });
      await onChanged();
      onClose();
    } catch (error) {
      Alert.alert('Could not save person', error instanceof Error ? error.message : String(error));
    }
  };

  const remove = () => {
    if (!person) return;
    Alert.alert('Delete person?', 'Their linked memories will remain, but the person association is removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePerson(person.id);
            await onChanged();
            onClose();
          } catch (error) {
            Alert.alert('Could not delete person', error instanceof Error ? error.message : String(error));
          }
        },
      },
    ]);
  };

  return (
    <Page style={styles.page}>
      <Pressable onPress={onClose} style={styles.backButton}>
        <AppText accent>{'< BACK'}</AppText>
      </Pressable>
      <View style={styles.personHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose person avatar"
          onPress={pickAvatar}
          style={styles.avatarButton}
        >
          {avatarBase64 ? (
            <Image
              source={{ uri: `data:${avatarMimeType ?? 'image/jpeg'};base64,${avatarBase64}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <AppText accent style={styles.avatarGlyph}>
                {(mentionKey.trim().replace(/^@/, '') || '?').slice(0, 1).toUpperCase()}
              </AppText>
            </View>
          )}
          <AppText muted style={styles.avatarLabel}>CHOOSE AVATAR</AppText>
        </Pressable>
        <View style={styles.personHeading}>
          <AppText muted style={styles.handleLabel}>HANDLE</AppText>
          <AppText bold accent style={styles.handle}>
            @{mentionKey.trim().replace(/^@/, '') || 'handle'}
          </AppText>
          {fullName.trim() ? (
            <AppText muted numberOfLines={1}>{fullName.trim()}</AppText>
          ) : null}
          <AppText bold accent style={styles.title}>
            {person ? '' : 'NEW PERSON'}
          </AppText>
        </View>
      </View>
      <View style={styles.tabs}>
        {(['memories', 'edit'] as const).map(item => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item }}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.activeTab]}
          >
            <AppText bold accent={tab === item}>{item.toUpperCase()}</AppText>
          </Pressable>
        ))}
      </View>
      {tab === 'memories' ? (
        <View style={styles.memories}>
          <AppText bold accent>LINKED MEMORIES · {linkedMemories.length}</AppText>
          {linkedMemories.length ? (
            linkedMemories.map(memory => (
              <Card key={memory.id}>
                <AppText>{memory.content}</AppText>
                <AppText muted style={styles.memoryDate}>
                  {new Date(memory.occurredAt).toLocaleString()}
                </AppText>
              </Card>
            ))
          ) : (
            <Card><AppText muted>No linked memories yet.</AppText></Card>
          )}
        </View>
      ) : (
        <View style={styles.form}>
          <TextField
            label="HANDLE · USED IN @MENTIONS"
            value={mentionKey}
            onChangeText={setMentionKey}
            placeholder="e.g. ali"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            label="FULL NAME · OPTIONAL"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Display name"
          />
          <OptionalDateField
            label="BIRTHDATE"
            value={birthdate ? new Date(`${birthdate}T12:00:00`) : null}
            onChange={date => setBirthdate(date ? localDateKey(date) : '')}
          />
          <TextField
            label="PHONE NUMBER"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder="Optional"
          />
          <TextField
            label="DESCRIPTION"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder="A few details about this person"
          />
          <AppText muted style={styles.hint}>
            Memories use @{mentionKey.trim().replace(/^@/, '') || 'handle'}; the full name is only for display.
          </AppText>
          <Button title="SAVE PERSON" onPress={save} />
          {person ? <Button title="DELETE PERSON" danger onPress={remove} /> : null}
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 14 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 2 },
  personHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  personHeading: { flex: 1, gap: 3 },
  handleLabel: { fontSize: 10, letterSpacing: 1 },
  handle: { fontSize: 18 },
  title: { fontSize: 19, letterSpacing: 1.5 },
  avatarButton: { alignItems: 'center', gap: 4, paddingVertical: 4 },
  avatarLabel: { fontSize: 8 },
  avatar: { width: 76, height: 76, borderRadius: 38 },
  avatarEmpty: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: { fontSize: 26 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: theme.green },
  form: { gap: 14 },
  memories: { gap: 10 },
  memoryDate: { fontSize: 10 },
  hint: { fontSize: 10 },
});

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDateKey(date) === value;
}
