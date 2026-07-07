import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { BottomNav } from '@/app/components/BottomNav';
import { PwaBanner } from '@/app/components/PwaBanner';
import { OfflinePill } from '@/app/components/OfflinePill';

// Route splitting: every page is its own chunk
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const TripsPage = lazy(() => import('@/features/trips/TripsPage'));
const TripDetailPage = lazy(() => import('@/features/trips/TripDetailPage'));
const TimelinePage = lazy(() => import('@/features/timeline/TimelinePage'));
const MapPage = lazy(() => import('@/features/map/MapPage'));
const ExpensePage = lazy(() => import('@/features/expense/ExpensePage'));
const MorePage = lazy(() => import('@/features/more/MorePage'));
const PackingPage = lazy(() => import('@/features/packing/PackingPage'));
const PlacesPage = lazy(() => import('@/features/places/PlacesPage'));
const ShoppingPage = lazy(() => import('@/features/shopping/ShoppingPage'));
const EmergencyPage = lazy(() => import('@/features/emergency/EmergencyPage'));
const PrintPage = lazy(() => import('@/features/print/PrintPage'));
const PhrasesPage = lazy(() => import('@/features/phrases/PhrasesPage'));
const SummaryPage = lazy(() => import('@/features/summary/SummaryPage'));

function Shell() {
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col">
      <PwaBanner />
      <main className="flex-1 overflow-y-auto px-4 pt-safe">
        <OfflinePill />
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-ink-3">
              載入中…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <span className="print:hidden"><BottomNav /></span>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/trips', element: <TripsPage /> },
      { path: '/trips/:tripId', element: <TripDetailPage /> },
      { path: '/timeline', element: <TimelinePage /> },
      { path: '/map', element: <MapPage /> },
      { path: '/expense', element: <ExpensePage /> },
      { path: '/more', element: <MorePage /> },
      { path: '/packing', element: <PackingPage /> },
      { path: '/places', element: <PlacesPage /> },
      { path: '/shopping', element: <ShoppingPage /> },
      { path: '/emergency', element: <EmergencyPage /> },
      { path: '/print', element: <PrintPage /> },
      { path: '/phrases', element: <PhrasesPage /> },
      { path: '/summary', element: <SummaryPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
