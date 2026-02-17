import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { EventPage } from '@/pages/EventPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background pb-12">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events/:id" element={<EventPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
