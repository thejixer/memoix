import { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { confirmRestore, exportBackup, restoreBackup } from '../database';
import { AppText, Button, Card, Page } from '../components/ui';

export default function BackupScreen({
  onRestored,
}: {
  onRestored: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const exportFile = async () => {
    setBusy(true);
    try {
      await exportBackup();
    } catch (error) {
      Alert.alert('Backup failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const importFile = async () => {
    if (!(await confirmRestore())) return;
    setBusy(true);
    try {
      const restored = await restoreBackup();
      if (restored) {
        await onRestored();
        Alert.alert('Backup restored', 'Your local data has been replaced with the backup.');
      }
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <AppText bold accent style={styles.title}>SETTINGS</AppText>
      <Card>
        <AppText bold>OFFLINE DATA</AppText>
        <AppText muted>
          Your memories, tags, people, and avatar images stay on this device in a local SQLite database.
          No account or network connection is required.
        </AppText>
      </Card>
      <Card>
        <AppText bold accent>CREATE BACKUP</AppText>
        <AppText muted>
          Export a portable .db file using the Android share sheet. Store a copy somewhere safe;
          app data can be lost if the app is uninstalled or the device is lost. Backup files are
          not encrypted, so save them somewhere private.
        </AppText>
        <Button
          title={busy ? 'PLEASE WAIT…' : 'EXPORT SQLITE BACKUP'}
          onPress={exportFile}
          disabled={busy}
        />
      </Card>
      <Card>
        <AppText bold accent>RESTORE BACKUP</AppText>
        <AppText muted>
          Choose a Memoix .db backup. The file is validated before restore. Restoring replaces
          all current memories, people, and tags on this device.
        </AppText>
        <Button
          title={busy ? 'PLEASE WAIT…' : 'RESTORE FROM FILE'}
          onPress={importFile}
          disabled={busy}
          danger
        />
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 19, letterSpacing: 1.5 },
});
