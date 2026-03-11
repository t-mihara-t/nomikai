import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { EventPage } from '@/pages/EventPage';
import { JoinPage } from '@/pages/JoinPage';
import { DayOfPage } from '@/pages/DayOfPage';
import { ArrivePage } from '@/pages/ArrivePage';
import { LineCallbackPage } from '@/pages/LineCallbackPage';
import { ReservePage } from '@/pages/ReservePage';
import { ParticipantViewPage } from '@/pages/ParticipantViewPage';
import { DashboardPage } from '@/pages/DashboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background pb-12">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events/:id" element={<EventPage />} />
          <Route path="/events/:id/day" element={<DayOfPage />} />
          <Route path="/events/:id/arrive" element={<ArrivePage />} />
          <Route path="/events/:id/reserve" element={<ReservePage />} />
          <Route path="/events/:id/my" element={<ParticipantViewPage />} />
          <Route path="/events/:id/dashboard" element={<DashboardPage />} />
          <Route path="/join/:id" element={<JoinPage />} />
          <Route path="/line-callback" element={<LineCallbackPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
