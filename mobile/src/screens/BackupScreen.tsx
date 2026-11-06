import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  confirmRestore,
  exportBackup,
  restoreBackup,
  selectBackupDirectory,
} from '../database';
import { AppText, Button, Card, Page } from '../components/ui';
import { ThemeName, themeNames, themes, useTheme } from '../theme';

export default function BackupScreen() {
  const [busy, setBusy] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'appearance' | 'backup' | 'about' | null>(
    'appearance',
  );
  const { theme, themeName, setTheme } = useTheme();

  const chooseTheme = async (nextTheme: ThemeName) => {
    try {
      await setTheme(nextTheme);
    } catch (error) {
      Alert.alert('Could not save theme', error instanceof Error ? error.message : String(error));
    }
  };

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

  const changeBackupFolder = async () => {
    setBusy(true);
    try {
      const selected = await selectBackupDirectory();
      if (selected) {
        Alert.alert('Backup folder saved', 'Future backups will be saved in this folder.');
      }
    } catch (error) {
      Alert.alert('Folder selection failed', error instanceof Error ? error.message : String(error));
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
        Alert.alert('Backup restored', 'Your local data has been replaced with the backup.');
      }
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const openFeedbackEmail = async () => {
    try {
      await Linking.openURL('mailto:aliasqar.aqchelou@gmail.com');
    } catch (error) {
      Alert.alert(
        'Could not open email',
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const toggleSection = (section: 'appearance' | 'backup' | 'about') => {
    setExpandedSection(current => current === section ? null : section);
  };

  return (
    <Page>
      <AppText bold accent style={styles.title}>SETTINGS</AppText>
      <Card>
        <AccordionHeader
          title="APPEARANCE"
          expanded={expandedSection === 'appearance'}
          onPress={() => toggleSection('appearance')}
        />
        {expandedSection === 'appearance' ? (
          <View style={styles.sectionContent}>
            <View style={styles.themeOptions}>
              {themeNames.map(option => {
                const palette = themes[option];
                const selected = themeName === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => void chooseTheme(option)}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: selected ? theme.surfaceRaised : theme.surface,
                        borderColor: selected ? theme.green : theme.border,
                      },
                    ]}
                  >
                    <View style={styles.themeSwatches}>
                      {[palette.background, palette.surface, palette.green, palette.muted].map(color => (
                        <View key={color} style={[styles.themeSwatch, { backgroundColor: color }]} />
                      ))}
                    </View>
                    <AppText bold={selected} accent={selected}>{option}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </Card>
      <Card>
        <AccordionHeader
          title="BACKUP & RESTORE"
          expanded={expandedSection === 'backup'}
          onPress={() => toggleSection('backup')}
        />
        {expandedSection === 'backup' ? (
          <View style={styles.sectionContent}>
            <AppText bold>OFFLINE DATA</AppText>
            <AppText muted>
              Your memories, tags, people, and avatar images stay on this device in a local SQLite database.
              No account or network connection is required.
            </AppText>
            <AppText bold accent>CREATE BACKUP</AppText>
            <AppText muted>
              {Platform.OS === 'android'
                ? 'Backups are saved to your selected folder. Choose a folder the first time, or change it later.'
                : 'Export a portable .db backup using the share sheet.'}{' '}
              Store a copy somewhere safe; app data can be lost if the app is uninstalled or the device
              is lost. Backup files are not encrypted, so save them somewhere private.
            </AppText>
            <Button
              title={
                busy
                  ? 'PLEASE WAIT…'
                  : Platform.OS === 'android'
                    ? 'SAVE SQLITE BACKUP'
                    : 'SHARE SQLITE BACKUP'
              }
              onPress={exportFile}
              disabled={busy}
            />
            {Platform.OS === 'android' ? (
              <Button
                title={busy ? 'PLEASE WAIT…' : 'SELECT / CHANGE BACKUP FOLDER'}
                onPress={changeBackupFolder}
                disabled={busy}
                secondary
              />
            ) : null}
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
          </View>
        ) : null}
      </Card>
      <Card>
        <AccordionHeader
          title="ABOUT"
          expanded={expandedSection === 'about'}
          onPress={() => toggleSection('about')}
        />
        {expandedSection === 'about' ? (
          <View style={styles.sectionContent}>
            <AppText muted>
              Thanks for using Memoix! I hope it helps you keep your thoughts and memories organized.
              Have feedback or suggestions? I&apos;d love to hear from you.
            </AppText>
            <View style={styles.contactRow}>
              <AppText muted>Contact: </AppText>
              <Pressable
                accessibilityRole="link"
                onPress={() => void openFeedbackEmail()}
              >
                <AppText accent style={styles.emailLink}>firstname.lastname@gmail.com</AppText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Card>
    </Page>
  );
}

function AccordionHeader({
  title,
  expanded,
  onPress,
}: {
  title: string;
  expanded: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={styles.accordionHeader}
    >
      <AppText bold accent>{title}</AppText>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d={expanded ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'}
          stroke={theme.muted}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 19, letterSpacing: 1.5 },
  accordionHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionContent: { gap: 12, paddingTop: 12 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  emailLink: { textDecorationLine: 'underline' },
  themeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeOption: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    gap: 8,
  },
  themeSwatches: { flexDirection: 'row', gap: 5 },
  themeSwatch: { width: 14, height: 14, borderRadius: 7 },
});
