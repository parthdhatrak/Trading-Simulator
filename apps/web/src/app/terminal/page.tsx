import TerminalLayout from '@/app/terminal/layout';
import Chart from '@/components/terminal/Chart';
import OrderForm from '@/components/terminal/OrderForm';

export const metadata = {
  title: 'Trading Terminal – Real‑time Stock View',
  description: 'Live chart powered by TwelveData and a stub order entry form.',
};

export default function TerminalPage() {
  return (
    <TerminalLayout>
      <h1 className="text-3xl font-bold mb-6 text-center text-emerald-400">Live Trading Terminal</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="h-96">
          <Chart />
        </div>
        <div className="flex items-start">
          <OrderForm />
        </div>
      </div>
    </TerminalLayout>
  );
}
