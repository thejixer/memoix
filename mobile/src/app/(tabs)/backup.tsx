import BackupScreen from '../../screens/BackupScreen';
import { useMemoix } from '../../MemoixProvider';

export default function BackupRoute() {
  const { refresh } = useMemoix();
  return <BackupScreen onRestored={refresh} />;
}
