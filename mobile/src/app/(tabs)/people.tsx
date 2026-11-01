import { useRouter } from 'expo-router';
import PeopleScreen from '../../screens/PeopleScreen';
import { useMemoix } from '../../MemoixProvider';

export default function PeopleRoute() {
  const router = useRouter();
  const { people, memories } = useMemoix();
  return (
    <PeopleScreen
      people={people}
      memories={memories}
      onOpenPerson={person =>
        router.push({
          pathname: '/person-editor',
          params: person ? { id: String(person.id) } : {},
        })
      }
    />
  );
}
