import { generatePayPayLink } from '@/lib/calculate';

interface PayPayLinkProps {
  paypayId: string;
  amount: number;
}

export function PayPayLink({ paypayId, amount }: PayPayLinkProps) {
  const url = generatePayPayLink(paypayId, amount);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
    >
      PayPay で支払う
    </a>
  );
}
