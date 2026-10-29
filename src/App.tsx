import { AppShell } from '@/components/layout/AppShell'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DeliveriesPage } from '@/pages/DeliveriesPage'
import { DeliveryDetailPage } from '@/pages/DeliveryDetailPage'
import { SubmitDeliveryPage } from '@/pages/SubmitDeliveryPage'
import { PlantConfirmationPage } from '@/pages/PlantConfirmationPage'
import { ReviewQueuePage } from '@/pages/ReviewQueuePage'
import { ReviewPage } from '@/pages/ReviewPage'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          {/* Dashboard */}
          <Route index element={<DashboardPage />} />

          {/* Deliveries */}
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="deliveries/new" element={<SubmitDeliveryPage />} />
          <Route path="deliveries/:id" element={<DeliveryDetailPage />} />
          <Route path="deliveries/:id/confirm" element={<PlantConfirmationPage />} />

          {/* Plant weighing overview (coming in Milestone 5) */}
          <Route path="plant" element={<ComingSoonPage />} />

          {/* Review & MRV */}
          <Route path="review" element={<ReviewQueuePage />} />
          <Route path="review/:id" element={<ReviewPage />} />

          {/* Projects + marketplace (coming in Milestone 7) */}
          <Route path="projects" element={<ComingSoonPage />} />
          <Route path="marketplace" element={<ComingSoonPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
