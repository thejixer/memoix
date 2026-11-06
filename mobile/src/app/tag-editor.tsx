import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, BackButton, Card, Page } from '../components/ui';
import TagEditorScreen from '../screens/TagEditorScreen';
import { getTagById } from '../database';
import { Tag } from '../domain';

export default function TagEditorRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [tag, setTag] = useState<Tag | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) return () => { active = false; };
    getTagById(Number(id))
      .then(result => {
        if (active) setTag(result);
      })
      .catch(error => {
        if (active) setFailure(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <Page><AppText muted>Loading tag…</AppText></Page>;
  if (failure) {
    return (
      <Page>
        <BackButton onPress={() => router.back()} />
        <Card><AppText>{failure}</AppText></Card>
      </Page>
    );
  }
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
      tag={tag}
      onClose={() => router.back()}
    />
  );
}
