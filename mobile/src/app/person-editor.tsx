import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, BackButton, Card, Page } from '../components/ui';
import PersonEditorScreen from '../screens/PersonEditorScreen';
import { getPersonById } from '../database';
import { Person } from '../domain';

export default function PersonEditorRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) return () => { active = false; };
    getPersonById(Number(id))
      .then(result => {
        if (active) setPerson(result);
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

  if (loading) return <Page><AppText muted>Loading person…</AppText></Page>;
  if (failure) {
    return (
      <Page>
        <BackButton onPress={() => router.back()} />
        <Card><AppText>{failure}</AppText></Card>
      </Page>
    );
  }
  if (id && !person) {
    return (
      <Page>
        <BackButton onPress={() => router.back()} />
        <AppText bold accent>PERSON NOT FOUND</AppText>
      </Page>
    );
  }
  return (
    <PersonEditorScreen
      person={person}
      onClose={() => router.back()}
    />
  );
}
