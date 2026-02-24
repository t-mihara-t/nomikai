import { useState, useEffect } from 'react';
import type { Arrival, DrinkOrder } from '@/types';
import { Button } from '@/components/ui/button';

interface HeroicEntryProps {
  arrival: Arrival;
  drinkOrders: DrinkOrder[];
  onDismiss: (arrivalId: number) => void;
  onConfirmOrder: (orderId: number) => void;
}

export function HeroicEntry({ arrival, drinkOrders, onDismiss, onConfirmOrder }: HeroicEntryProps) {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Play arrival sound effect
    playArrivalSound();
    // Transition from enter to show
    const t1 = setTimeout(() => setPhase('show'), 100);
    return () => clearTimeout(t1);
  }, []);

  const handleDismiss = () => {
    setPhase('exit');
    setTimeout(() => {
      setVisible(false);
      onDismiss(arrival.id);
    }, 500);
  };

  if (!visible) return null;

  const participantOrders = drinkOrders.filter(
    (o) => o.participant_id === arrival.participant_id && !o.confirmed
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${
        phase === 'enter' ? 'opacity-0' : phase === 'exit' ? 'opacity-0 scale-95' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
      onClick={handleDismiss}
    >
      <div
        className={`relative max-w-sm w-full mx-4 text-center transition-all duration-700 ${
          phase === 'show' ? 'scale-100 translate-y-0' : 'scale-50 translate-y-8'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Radial burst effect */}
        <div className="absolute inset-0 heroic-burst" />

        {/* Main content */}
        <div className="relative z-10 space-y-6 p-6">
          {/* Title flash */}
          <div className="heroic-flash">
            <p className="text-yellow-400 text-sm font-bold tracking-widest uppercase heroic-tracking">
              HEROIC ENTRY
            </p>
          </div>

          {/* Name - large dynamic typography */}
          <div className="heroic-name-container">
            <h1 className="text-5xl font-black text-white heroic-name-text">
              {arrival.participant_name || '参加者'}
            </h1>
            <p className="text-2xl font-bold text-yellow-300 mt-2 heroic-subtitle">
              参上！
            </p>
          </div>

          {/* ETA */}
          {arrival.eta_minutes != null && arrival.status === 'approaching' && (
            <div className="heroic-eta">
              <span className="inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white text-lg font-bold px-6 py-3 rounded-full">
                あと約 {arrival.eta_minutes} 分で到着
              </span>
            </div>
          )}

          {arrival.status === 'arrived' && (
            <div className="heroic-eta">
              <span className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg font-bold px-6 py-3 rounded-full heroic-pulse">
                到着しました！
              </span>
            </div>
          )}

          {/* Message */}
          {arrival.message && (
            <p className="text-white/80 text-base italic">「{arrival.message}」</p>
          )}

          {/* Drink orders from this person */}
          {participantOrders.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-3">
              <p className="text-yellow-300 font-bold text-sm">注文リクエスト</p>
              {participantOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-2">
                  <span className="text-white text-base">
                    {order.drink_name}
                    {order.quantity > 1 && ` ×${order.quantity}`}
                    {order.note && <span className="text-white/60 text-xs ml-1">({order.note})</span>}
                  </span>
                  <Button
                    size="sm"
                    className="min-h-[48px] min-w-[48px] bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={() => onConfirmOrder(order.id)}
                  >
                    注文OK
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Dismiss button */}
          <Button
            className="min-h-[56px] w-full text-lg font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30"
            onClick={handleDismiss}
          >
            OK！
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Play a short, attention-grabbing sound using Web Audio API */
function playArrivalSound() {
  try {
    const ctx = new AudioContext();

    // "Level up" style ascending arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);

      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.4);
    });

    // Final chord
    const chordFreqs = [523.25, 659.25, 783.99];
    chordFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

      osc.start(ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 1.5);
    });
  } catch {
    // Web Audio not available - silent fallback
  }
}
