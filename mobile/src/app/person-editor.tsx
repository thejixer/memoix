import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, BackButton, Page } from '../components/ui';
import { useMemoix } from '../MemoixProvider';
import PersonEditorScreen from '../screens/PersonEditorScreen';

export default function PersonEditorRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { people, memories, refresh } = useMemoix();
  const person = id ? people.find(item => item.id === Number(id)) : null;

  if (id && !person) {
    return (
      <Page>
        <BackButton onPress={() => router.back()} />
        <AppText bold accent>PERSON NOT FOUND</AppText>
      </Page>
    );
  }

  return (
    <PersonEditorScreen
      person={person ?? null}
      memories={memories}
      onChanged={refresh}
      onClose={() => router.back()}
    />
  );
}
