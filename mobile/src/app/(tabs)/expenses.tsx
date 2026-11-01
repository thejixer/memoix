import ExpenseAnalyticsScreen from '../../screens/ExpenseAnalyticsScreen';
import { useMemoix } from '../../MemoixProvider';

export default function ExpensesRoute() {
  const { memories } = useMemoix();
  return <ExpenseAnalyticsScreen memories={memories} />;
}
