import { useRouter } from 'expo-router';
import PeopleScreen from '../../screens/PeopleScreen';
import { useMemoix } from '../../MemoixProvider';

export default function PeopleRoute() {
  const router = useRouter();
  const { people, memories, tags } = useMemoix();
  return (
    <PeopleScreen
      people={people}
      memories={memories}
      tags={tags}
      onOpenPerson={person =>
        router.push({
          pathname: '/person-editor',
          params: person ? { id: String(person.id) } : {},
        })
      }
      onOpenTag={tag =>
        router.push({
          pathname: '/tag-editor',
          params: tag ? { id: String(tag.id) } : {},
        })
      }
    />
  );
}
