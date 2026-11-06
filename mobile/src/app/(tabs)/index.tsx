import { useRouter } from 'expo-router';
import MemoriesScreen from '../../screens/MemoriesScreen';

export default function MemoriesRoute() {
  const router = useRouter();

  return (
    <MemoriesScreen
      onEdit={memory =>
        router.push({ pathname: '/memory-editor', params: { id: String(memory.id) } })
      }
    />
  );
}
