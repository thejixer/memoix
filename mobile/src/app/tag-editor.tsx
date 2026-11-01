import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, BackButton, Page } from '../components/ui';
import { useMemoix } from '../MemoixProvider';
import TagEditorScreen from '../screens/TagEditorScreen';

export default function TagEditorRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { tags, memories, refresh } = useMemoix();
  const tag = id ? tags.find(item => item.id === Number(id)) : null;

  if (id && !tag) {
    return (
      <Page>
        <BackButton onPress={() => router.back()} />
        <AppText bold accent>TAG NOT FOUND</AppText>
      </Page>
    );
  }

  return (
    <TagEditorScreen
      tag={tag ?? null}
      memories={memories}
      onChanged={refresh}
      onClose={() => router.back()}
    />
  );
}
