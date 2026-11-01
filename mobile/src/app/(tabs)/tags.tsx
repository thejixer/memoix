import { useRouter } from 'expo-router';
import TagsScreen from '../../screens/TagsScreen';
import { useMemoix } from '../../MemoixProvider';

export default function TagsRoute() {
  const router = useRouter();
  const { tags, memories } = useMemoix();
  return (
    <TagsScreen
      tags={tags}
      memories={memories}
      onOpenTag={tag =>
        router.push({
          pathname: '/tag-editor',
          params: tag ? { id: String(tag.id) } : {},
        })
      }
    />
  );
}
