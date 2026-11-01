import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { deletePerson, savePerson } from '../database';
import { localDateKey, Memory, Person } from '../domain';
import { theme } from '../theme';
import { AppText, Button, Card, Page, TextField } from '../components/ui';

const emptyPerson = {
  fullName: '',
  mentionKey: '',
  description: '',
  birthdate: null,
  phoneNumber: '',
  avatarBase64: null,
  avatarMimeType: null,
};

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
  const [fullName, setFullName] = useState(person?.fullName ?? '');
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
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Enter the person’s full name.');
      return;
    }
    if (birthdate && !isValidDate(birthdate)) {
      Alert.alert('Invalid birthdate', 'Enter a real date in YYYY-MM-DD format.');
      return;
    }
    try {
      await savePerson({
        ...(person ? { id: person.id } : {}),
        ...emptyPerson,
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
    <Page>
      <Pressable onPress={onClose}><AppText accent>{'< BACK'}</AppText></Pressable>
      <AppText bold accent style={styles.title}>
        {person ? 'EDIT PERSON' : 'NEW PERSON'}
      </AppText>
      <Pressable onPress={pickAvatar} style={styles.avatarButton}>
        {avatarBase64 ? (
          <Image
            source={{ uri: `data:${avatarMimeType ?? 'image/jpeg'};base64,${avatarBase64}` }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <AppText accent style={styles.avatarGlyph}>+</AppText>
          </View>
        )}
        <AppText muted>CHOOSE AVATAR</AppText>
      </Pressable>
      <TextField label="FULL NAME" value={fullName} onChangeText={setFullName} />
      <TextField
        label="BIRTHDATE · YYYY-MM-DD"
        value={birthdate}
        onChangeText={setBirthdate}
        placeholder="Optional"
        autoCapitalize="none"
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
        Their mention key will be @{fullName.trim().replace(/\s+/g, '_').toLocaleLowerCase() || 'name'}.
      </AppText>
      <Button title="SAVE PERSON" onPress={save} />
      {person ? <Button title="DELETE PERSON" danger onPress={remove} /> : null}
      {linkedMemories.length > 0 && (
        <Card>
          <AppText bold accent>LINKED MEMORIES · {linkedMemories.length}</AppText>
          {linkedMemories.slice(0, 5).map(memory => (
            <AppText key={memory.id} numberOfLines={2}>{memory.content}</AppText>
          ))}
        </Card>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 19, letterSpacing: 1.5 },
  avatarButton: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarEmpty: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: { fontSize: 26 },
  hint: { fontSize: 10 },
});

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDateKey(date) === value;
}
