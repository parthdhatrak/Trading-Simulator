import TerminalLayout from '@/app/terminal/layout';
import TerminalDashboard from '@/components/terminal/TerminalDashboard';

export const metadata = {
  title: 'Trading Terminal – ApeX Simulator',
  description: 'Production-grade, real-time stock and crypto matching engine simulation dashboard.',
};

export default function TerminalPage() {
  return (
    <TerminalLayout>
      <TerminalDashboard />
    </TerminalLayout>
  );
}
