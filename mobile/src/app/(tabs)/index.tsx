import { useRouter } from 'expo-router';
import MemoriesScreen from '../../screens/MemoriesScreen';
import { useMemoix } from '../../MemoixProvider';

export default function MemoriesRoute() {
  const router = useRouter();
  const { memories, people, tags, refresh } = useMemoix();

  return (
    <MemoriesScreen
      memories={memories}
      people={people}
      tags={tags}
      onCreate={() => router.push('/memory-editor')}
      onEdit={memory =>
        router.push({ pathname: '/memory-editor', params: { id: String(memory.id) } })
      }
      onChanged={refresh}
    />
  );
}
