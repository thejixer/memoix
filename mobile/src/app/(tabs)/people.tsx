import { useRouter } from 'expo-router';
import PeopleScreen from '../../screens/PeopleScreen';

export default function PeopleRoute() {
  const router = useRouter();
  return (
    <PeopleScreen
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
