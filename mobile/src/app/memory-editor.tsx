import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, BackButton, Page } from '../components/ui';
import MemoryEditor from '../components/MemoryEditor';
import { useMemoix } from '../MemoixProvider';

export default function MemoryEditorRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { memories, people, tags, refresh } = useMemoix();
  const memory = id ? memories.find(item => item.id === Number(id)) : null;

  if (id && !memory) {
    return (
      <Page>
        <BackButton onPress={() => router.back()} />
        <AppText bold accent>MEMORY NOT FOUND</AppText>
      </Page>
    );
  }

  return (
    <MemoryEditor
      key={memory?.id ?? 'new'}
      memory={memory ?? null}
      people={people}
      tags={tags}
      memories={memories}
      onClose={() => router.back()}
      onSaved={async () => {
        await refresh();
        router.back();
      }}
    />
  );
}
