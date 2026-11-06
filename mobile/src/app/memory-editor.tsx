import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, BackButton, Card, Page } from '../components/ui';
import MemoryEditor from '../components/MemoryEditor';
import { getMemoryById } from '../database';
import { Memory } from '../domain';

export default function MemoryEditorRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) return () => { active = false; };
    getMemoryById(Number(id))
      .then(result => {
        if (active) setMemory(result);
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

  if (loading) {
    return <Page><AppText muted>Loading memory…</AppText></Page>;
  }
  if (failure) {
    return (
      <Page>
        <BackButton onPress={() => router.back()} />
        <Card><AppText>{failure}</AppText></Card>
      </Page>
    );
  }
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
      memory={memory}
      onClose={() => router.back()}
    />
  );
}
